import { createReminderService } from '@/features/reminders/application/reminder-service';
import {
  ReminderError,
  type Reminder,
} from '@/features/reminders/domain/reminder';

const reminder: Reminder = {
  kind: 'habit',
  targetId: '11111111-1111-4111-8111-111111111111',
  hour: 8,
  minute: 30,
  weekdays: [1, 3, 7],
};
function setup(initial: string | null = null) {
  let raw = initial;
  const storage = {
    read: jest.fn(async () => raw),
    write: jest.fn(async (value: string) => {
      raw = value;
    }),
  };
  const scheduler = {
    requestPermission: jest.fn(async () => true),
    replace: jest.fn(
      async (_userId: string | null, _entries: readonly Reminder[]) =>
        undefined,
    ),
  };
  const service = createReminderService(storage, scheduler);
  return { service, storage, scheduler, readRaw: () => raw };
}
describe('local reminder settings and recovery', () => {
  it('restores settings on restart without requesting permission and replaces an edited target', async () => {
    const { service, storage, scheduler } = setup();
    await service.activate('alice');
    expect(scheduler.requestPermission).not.toHaveBeenCalled();
    await service.save(reminder);
    await service.save({ ...reminder, hour: 17, weekdays: [2] });
    const restarted = createReminderService(storage, scheduler);
    await restarted.activate('alice');
    expect(restarted.getSnapshot().entries).toEqual([
      { ...reminder, hour: 17, weekdays: [2] },
    ]);
    expect(scheduler.replace).toHaveBeenLastCalledWith(
      'alice',
      restarted.getSnapshot().entries,
    );
  });
  it('does not persist or announce success if permission is denied', async () => {
    const { service, scheduler, storage } = setup();
    await service.activate('alice');
    storage.write.mockClear();
    scheduler.replace.mockClear();
    scheduler.requestPermission.mockResolvedValue(false);
    await expect(service.save(reminder)).rejects.toMatchObject({
      code: 'permission',
    });
    expect(storage.write).not.toHaveBeenCalled();
    expect(scheduler.replace).not.toHaveBeenCalled();
    expect(service.getSnapshot()).toMatchObject({
      entries: [],
      error: 'permission',
      busy: false,
    });
  });
  it.each([
    { hour: 24 },
    { hour: -1 },
    { minute: 60 },
    { weekdays: [] },
    { weekdays: [0] },
    { weekdays: [1, 1] },
    { targetId: '../sign-in' },
  ])('rejects invalid input %j before scheduling', async (change) => {
    const { service, scheduler } = setup();
    await service.activate('alice');
    await expect(
      service.save({ ...reminder, ...change }),
    ).rejects.toMatchObject({ code: 'invalid' });
    expect(scheduler.requestPermission).not.toHaveBeenCalled();
  });
  it('keeps confirmed settings if the new settings cannot be saved', async () => {
    const { service, storage } = setup();
    await service.activate('alice');
    await service.save(reminder);
    storage.write.mockRejectedValueOnce(new Error('keychain'));
    await expect(service.save({ ...reminder, hour: 12 })).rejects.toMatchObject(
      { code: 'storage' },
    );
    expect(service.getSnapshot().entries).toEqual([reminder]);
  });
  it('retains desired settings after scheduling failure and applies them on retry', async () => {
    const { service, scheduler } = setup();
    await service.activate('alice');
    scheduler.replace.mockRejectedValueOnce(new ReminderError('schedule'));
    await expect(service.save(reminder)).rejects.toThrow();
    expect(service.getSnapshot()).toMatchObject({
      entries: [reminder],
      error: 'schedule',
    });
    await service.activate('alice');
    expect(service.getSnapshot()).toMatchObject({
      entries: [reminder],
      ready: true,
      error: null,
    });
  });
  it('removes disabled schedules across a restart', async () => {
    const { service, storage, scheduler } = setup();
    await service.activate('alice');
    await service.save(reminder);
    await service.remove(reminder);
    const restarted = createReminderService(storage, scheduler);
    await restarted.activate('alice');
    expect(restarted.getSnapshot().entries).toEqual([]);
    expect(scheduler.replace).toHaveBeenLastCalledWith('alice', []);
  });
  it('clears native requests and account settings on logout and account change', async () => {
    const { service, readRaw, scheduler } = setup();
    await service.activate('alice');
    await service.save(reminder);
    await service.activate('bob');
    expect(service.getSnapshot().entries).toEqual([]);
    expect(readRaw()).not.toContain('alice');
    await service.save(reminder);
    await service.reset();
    expect(scheduler.replace).toHaveBeenLastCalledWith(null, []);
    expect(JSON.parse(readRaw()!)).toEqual({
      version: 1,
      userId: null,
      entries: [],
    });
  });
  it('blocks an in-flight permission result after the account changes', async () => {
    const { service, scheduler } = setup();
    await service.activate('alice');
    let allow!: (value: boolean) => void;
    scheduler.requestPermission.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          allow = resolve;
        }),
    );
    const save = service.save(reminder);
    await Promise.resolve();
    const logout = service.reset();
    allow(true);
    await expect(save).rejects.toMatchObject({ code: 'unavailable' });
    await logout;
    expect(service.getSnapshot().entries).toEqual([]);
    expect(scheduler.replace).toHaveBeenLastCalledWith(null, []);
  });
  it('clears native requests and exposes a storage error for corrupt preferences', async () => {
    const { service, scheduler } = setup('{broken');
    await expect(service.activate('alice')).rejects.toMatchObject({
      code: 'storage',
    });
    expect(scheduler.replace).toHaveBeenCalledWith(null, []);
    expect(service.getSnapshot()).toMatchObject({
      ready: false,
      error: 'storage',
    });
    await service.reset();
    await service.activate('alice');
    expect(service.getSnapshot()).toMatchObject({ ready: true, entries: [] });
  });
  it('limits native schedules to 56 weekly requests while still allowing edits at the cap', async () => {
    const { service } = setup();
    await service.activate('alice');
    for (let i = 1; i <= 8; i++)
      await service.save({
        ...reminder,
        targetId: `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`,
      });
    await expect(service.save(reminder)).rejects.toMatchObject({
      code: 'limit',
    });
    await service.save({ ...service.getSnapshot().entries[0]!, hour: 23 });
    expect(service.getSnapshot().entries).toHaveLength(8);
  });
});
