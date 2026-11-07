import type { BackendClient } from '@/infrastructure/supabase/client';
import { createRoutineRepository } from '@/features/routines/infrastructure/supabase-routine-repository';
import { routine, routineId, ownStepId } from './helpers/routine-fixtures';
import {
  userId,
  habitId,
  definitionId,
  operationId,
} from './helpers/habit-fixtures';

const timestamp = '2026-10-21T12:00:00Z';
const row = {
  id: routineId,
  user_id: userId,
  name: routine.name,
  start_date: '2026-10-01',
  created_at: timestamp,
  updated_at: timestamp,
  archived_at: null,
  definitions: [
    {
      id: definitionId,
      routine_id: routineId,
      user_id: userId,
      effective_from: '2026-10-01',
      time_zone: 'America/Bogota',
      week_start_day: 1,
      schedule_type: 'daily',
      weekday_mask: null,
      steps: [
        {
          id: ownStepId,
          kind: 'own',
          required: true,
          position: 0,
          title: 'Desk',
          habit_id: null,
        },
      ],
    },
  ],
};
function backend(data: unknown, error: { code: string } | null = null) {
  const result = { data, error };
  const promise = Promise.resolve(result);
  const query = {
    select: jest.fn(),
    in: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    then: promise.then.bind(promise),
  };
  for (const method of [query.select, query.in, query.gte, query.lte])
    method.mockReturnValue(query);
  const client = {
    rpc: jest.fn(async () => result),
    from: jest.fn(() => query),
  };
  return {
    client: client as unknown as BackendClient,
    rpc: client.rpc,
    from: client.from,
  };
}
describe('routine service boundary', () => {
  it('reads ordered definitions and rejects malformed, duplicate or foreign rows', async () => {
    const client = backend({ routines: [row], has_more: false });
    expect(
      await createRoutineRepository(client.client).findById(routineId),
    ).toMatchObject({
      id: routineId,
      definitions: [{ steps: [{ kind: 'own', title: 'Desk' }] }],
    });
    expect(client.rpc).toHaveBeenCalledWith('get_routines', {
      p_ids: [routineId],
      p_offset: 0,
      p_archived: false,
    });
    for (const bad of [
      null,
      { ...row, definitions: [] },
      { ...row, definitions: [{ ...row.definitions[0], user_id: habitId }] },
      { ...row, definitions: [row.definitions[0], row.definitions[0]] },
      {
        ...row,
        definitions: [
          {
            ...row.definitions[0],
            steps: [{ ...row.definitions[0]!.steps[0], position: 1 }],
          },
        ],
      },
    ]) {
      await expect(
        createRoutineRepository(
          backend({ routines: [bad], has_more: false }).client,
        ).findById(routineId),
      ).rejects.toMatchObject({ code: 'service' });
    }
    await expect(
      createRoutineRepository(
        backend({ routines: [row], has_more: false }).client,
      ).findById(habitId),
    ).rejects.toMatchObject({ code: 'service' });
  });
  it('distinguishes missing detail from service failure and validates the read window', async () => {
    await expect(
      createRoutineRepository(
        backend({ routines: [], has_more: false }).client,
      ).findById(routineId),
    ).resolves.toBeNull();
    await expect(
      createRoutineRepository(backend(null, { code: 'RT004' }).client).findById(
        routineId,
      ),
    ).rejects.toMatchObject({ code: 'notFound' });
    const repository = createRoutineRepository(backend([]).client);
    await expect(
      repository.readDays([routineId, habitId], '2026-10-01', '2026-10-28'),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    await expect(
      repository.readDays([routineId], '2026-10-01', '2026-10-29'),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    await expect(
      repository.readDays([routineId], '2026-10-01', '2026-10-28'),
    ).resolves.toEqual([]);
  });
  it('sends stable step identities and keeps linked habits out of own-step commands', async () => {
    const { client, rpc } = backend(routineId);
    await createRoutineRepository(client).create({
      id: routineId,
      name: 'Morning',
      scheduleType: 'daily',
      steps: [{ id: ownStepId, kind: 'habit', habitId, required: false }],
    });
    expect(rpc).toHaveBeenCalledWith('create_routine', {
      p_id: routineId,
      p_name: 'Morning',
      p_schedule_type: 'daily',
      p_steps: [
        {
          id: ownStepId,
          kind: 'habit',
          required: false,
          title: null,
          habit_id: habitId,
        },
      ],
    });
  });
  it('rejects unrelated receipts and maps safe routine error codes', async () => {
    const input = {
      operationId,
      routineId,
      stepId: ownStepId,
      date: '2026-10-21',
      completed: true,
      expectedRevision: 0,
    };
    const receipt = {
      operation_id: operationId,
      routine_id: routineId,
      step_id: ownStepId,
      occurrence_date: input.date,
      completed: true,
      revision: 1,
    };
    await expect(
      createRoutineRepository(backend(receipt).client).record(input),
    ).resolves.toMatchObject({ revision: 1 });
    await expect(
      createRoutineRepository(
        backend({ ...receipt, step_id: habitId }).client,
      ).record(input),
    ).rejects.toMatchObject({ code: 'service' });
    for (const [code, expected] of [
      ['RT009', 'archived'],
      ['RT011', 'flexibleOptional'],
      ['RT012', 'noRequiredOverlap'],
      ['RT008', 'conflict'],
    ])
      await expect(
        createRoutineRepository(backend(null, { code: code! }).client).record(
          input,
        ),
      ).rejects.toMatchObject({ code: expected });
  });
});
