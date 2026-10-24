import { createHabitRepository } from '@/features/habits/infrastructure/supabase-habit-repository';
import { createProfileRepository } from '@/features/profile/infrastructure/supabase-profile-repository';
import type { BackendClient } from '@/infrastructure/supabase/client';
import { OperationError } from '@/shared/domain/operation-error';
import {
  definitionId,
  habitId,
  operationId,
  userId,
} from './helpers/habit-fixtures';

const timestamp = '2026-10-21T12:00:00+00:00';
const row = {
  id: habitId,
  user_id: userId,
  name: 'Reading',
  start_date: '2026-10-01',
  created_at: timestamp,
  updated_at: timestamp,
  habit_definitions: [
    {
      id: definitionId,
      habit_id: habitId,
      user_id: userId,
      effective_from: '2026-10-01',
      measurement_mode: 'quantity',
      schedule_type: 'weekly',
      target_milliunits: 20000,
      unit_label: 'pages',
      weekly_target: 3,
      weekday_mask: null,
      time_zone: 'America/Bogota',
      week_start_day: 1,
    },
  ],
};
function clientStub(data: unknown, error: { code: string } | null = null) {
  const result = { data, error };
  const query = {
    select: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    maybeSingle: jest.fn(async () => result),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
  for (const method of [
    query.select,
    query.order,
    query.range,
    query.eq,
    query.in,
    query.gte,
    query.lte,
  ])
    method.mockReturnValue(query);
  const client = {
    from: jest.fn(() => query),
    rpc: jest.fn(async () => result),
  };
  return {
    client: client as unknown as BackendClient,
    query,
    rpc: client.rpc,
    from: client.from,
  };
}
describe('habit Supabase boundary', () => {
  it('reads ordered definition history without treating a future version as current', async () => {
    const first = row.habit_definitions[0]!;
    const future = {
      ...first,
      id: operationId,
      effective_from: '2026-10-26',
      target_milliunits: 30000,
    };
    const value = await createHabitRepository(
      clientStub({ ...row, habit_definitions: [future, first] }).client,
    ).findById(habitId);
    expect(value?.definition.id).toBe(definitionId);
    expect(
      value?.definitionHistory?.map((definition) => definition.id),
    ).toEqual([definitionId, operationId]);
    await expect(
      createHabitRepository(
        clientStub({
          ...row,
          habit_definitions: [first, { ...future, unit_label: 'ml' }],
        }).client,
      ).findById(habitId),
    ).rejects.toMatchObject({ code: 'service' });
  });
  it('sends configuration edits with a concurrency token and reads the server effective date', async () => {
    const { client, rpc } = clientStub({
      operation_id: operationId,
      habit_id: habitId,
      updated_at: timestamp,
      effective_from: '2026-10-26',
    });
    await expect(
      createHabitRepository(client).edit({
        operationId,
        habitId,
        name: 'Updated',
        expectedUpdatedAt: timestamp,
        scheduleType: 'weekly',
        weeklyTarget: 3,
        targetMilliunits: 30000,
      }),
    ).resolves.toEqual({ effectiveFrom: '2026-10-26' });
    expect(rpc).toHaveBeenCalledWith('edit_habit', {
      p_operation_id: operationId,
      p_habit_id: habitId,
      p_name: 'Updated',
      p_expected_updated_at: timestamp,
      p_schedule_type: 'weekly',
      p_weekly_target: 3,
      p_target_milliunits: 30000,
    });
  });
  it('renames by RPC with the observed token and validates the receipt identity', async () => {
    const { client, rpc } = clientStub({
      operation_id: operationId,
      habit_id: habitId,
      updated_at: timestamp,
    });
    const input = {
      operationId,
      habitId,
      name: 'Updated',
      expectedUpdatedAt: timestamp,
    };
    await createHabitRepository(client).rename(input);
    expect(rpc).toHaveBeenCalledWith('rename_habit', {
      p_operation_id: operationId,
      p_habit_id: habitId,
      p_name: 'Updated',
      p_expected_updated_at: timestamp,
    });
    await expect(
      createHabitRepository(
        clientStub({
          operation_id: userId,
          habit_id: habitId,
          updated_at: timestamp,
        }).client,
      ).rename(input),
    ).rejects.toMatchObject({ code: 'service' });
  });
  it('validates definitions and returns a bounded deterministic page', async () => {
    const { client, query } = clientStub([row]);
    expect(await createHabitRepository(client).list(30)).toMatchObject({
      hasMore: false,
      habits: [
        {
          id: habitId,
          definition: {
            measurementMode: 'quantity',
            scheduleType: 'weekly',
            weeklyTarget: 3,
          },
        },
      ],
    });
    expect(query.range).toHaveBeenCalledWith(30, 60);
    expect(query.order).toHaveBeenCalledWith('id', { ascending: false });
  });
  it('distinguishes absent data from malformed rows and query failure', async () => {
    expect(
      await createHabitRepository(clientStub(null).client).findById(habitId),
    ).toBeNull();
    await expect(
      createHabitRepository(
        clientStub({ ...row, habit_definitions: [] }).client,
      ).findById(habitId),
    ).rejects.toMatchObject({ code: 'service' });
    await expect(
      createHabitRepository(clientStub(null, { code: '' }).client).findById(
        habitId,
      ),
    ).rejects.toMatchObject({ code: 'network' });
    await expect(
      createHabitRepository(
        clientStub([
          {
            ...row,
            habit_definitions: [
              { ...row.habit_definitions[0], target_milliunits: null },
            ],
          },
        ]).client,
      ).list(0),
    ).rejects.toBeInstanceOf(OperationError);
  });
  it('does not convert history errors into an empty collection', async () => {
    const { client, query } = clientStub([], { code: '42501' });
    await expect(
      createHabitRepository(client).readDays(
        [habitId],
        '2026-10-01',
        '2026-10-21',
      ),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(query.gte).toHaveBeenCalledWith('occurrence_date', '2026-10-01');
    expect(query.lte).toHaveBeenCalledWith('occurrence_date', '2026-10-21');
  });
  it('uses RPC for creation and omits fields inapplicable to its discriminants', async () => {
    const { client, rpc, from } = clientStub(habitId);
    await createHabitRepository(client).create({
      id: habitId,
      name: 'Read',
      measurementMode: 'binary',
      scheduleType: 'daily',
    });
    expect(rpc).toHaveBeenCalledWith('create_habit', {
      p_id: habitId,
      p_name: 'Read',
      p_measurement_mode: 'binary',
      p_schedule_type: 'daily',
    });
    expect(from).not.toHaveBeenCalled();
  });
  it('keeps operation identity, revision and original receipt separate from state', async () => {
    const { client, rpc } = clientStub({
      operation_id: operationId,
      habit_id: habitId,
      occurrence_date: '2026-10-21',
      revision: 3,
      binary_value: null,
      amount_milliunits: 750000,
    });
    expect(
      await createHabitRepository(client).record({
        operationId,
        habitId,
        date: '2026-10-21',
        kind: 'set_total',
        amountMilliunits: 750000,
        expectedRevision: 2,
      }),
    ).toMatchObject({ revision: 3, amountMilliunits: 750000 });
    expect(rpc).toHaveBeenCalledWith('record_habit_day', {
      p_operation_id: operationId,
      p_habit_id: habitId,
      p_occurrence_date: '2026-10-21',
      p_kind: 'set_total',
      p_amount_milliunits: 750000,
      p_expected_revision: 2,
    });
  });
  it.each([
    ['HT005', 'operationReused'],
    ['HT006', 'outsideWindow'],
    ['HT008', 'conflict'],
    ['HT010', 'amountLimit'],
  ] as const)('maps %s to a safe domain code', async (code, expected) => {
    const repository = createHabitRepository(clientStub(null, { code }).client);
    await expect(
      repository.record({
        operationId,
        habitId,
        date: '2026-10-21',
        kind: 'add_amount',
        amountMilliunits: 1,
      }),
    ).rejects.toMatchObject({ code: expected, message: expected });
  });
  it('rejects a receipt for a different operation', async () => {
    const repository = createHabitRepository(
      clientStub({
        operation_id: userId,
        habit_id: habitId,
        occurrence_date: '2026-10-21',
        revision: 1,
        binary_value: null,
        amount_milliunits: 1,
      }).client,
    );
    await expect(
      repository.record({
        operationId,
        habitId,
        date: '2026-10-21',
        kind: 'add_amount',
        amountMilliunits: 1,
      }),
    ).rejects.toMatchObject({ code: 'service' });
  });
  it('handles an unselected calendar despite generated RPC nullability', async () => {
    const repository = createProfileRepository(
      clientStub([
        {
          server_time: timestamp,
          business_date: null,
          time_zone: null,
          week_start_day: null,
          week_start_date: null,
          next_day_at: null,
        },
      ]).client,
    );
    expect(await repository.getBusinessContext()).toEqual({
      configured: false,
      serverTime: timestamp,
    });
  });
  it('maps a selected remote account calendar', async () => {
    const repository = createProfileRepository(
      clientStub([
        {
          server_time: timestamp,
          business_date: '2026-10-21',
          time_zone: 'America/Bogota',
          week_start_day: 1,
          week_start_date: '2026-10-19',
          next_day_at: '2026-10-22T05:00:00+00:00',
        },
      ]).client,
    );
    expect(await repository.getBusinessContext()).toMatchObject({
      configured: true,
      today: '2026-10-21',
      timeZone: 'America/Bogota',
      weekStartDay: 1,
    });
  });
});
