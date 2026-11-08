import { z } from 'zod';
import {
  MAX_REMINDERS,
  ReminderError,
  sameTarget,
  type Reminder,
  type ReminderTarget,
  type ReminderStorage,
  type ReminderScheduler,
  type ReminderErrorCode,
} from '../domain/reminder';

const reminderSchema = z.object({
  kind: z.enum(['habit', 'routine']),
  targetId: z.uuid(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  weekdays: z
    .array(z.number().int().min(1).max(7))
    .min(1)
    .max(7)
    .refine((days) => new Set(days).size === days.length),
});
const storedSchema = z.object({
  version: z.literal(1),
  userId: z.string().nullable(),
  entries: z
    .array(reminderSchema)
    .max(MAX_REMINDERS)
    .refine((entries) =>
      entries.every(
        (entry, i) =>
          entries.findIndex((other) => sameTarget(entry, other)) === i,
      ),
    ),
});
export type ReminderSnapshot = {
  userId: string | null;
  entries: readonly Reminder[];
  ready: boolean;
  busy: boolean;
  error: ReminderErrorCode | null;
};

export function createReminderService(
  storage: ReminderStorage,
  scheduler: ReminderScheduler,
) {
  let snapshot: ReminderSnapshot = {
    userId: null,
    entries: [],
    ready: false,
    busy: false,
    error: null,
  };
  let owner: string | null = null;
  let generation = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<ReminderSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  function run(work: () => Promise<void>) {
    const result = queue.then(async () => {
      publish({ busy: true, error: null });
      try {
        await work();
      } catch (error) {
        publish({
          error: error instanceof ReminderError ? error.code : 'schedule',
        });
        throw error;
      } finally {
        publish({ busy: false });
      }
    });
    queue = result.catch(() => undefined);
    return result;
  }
  async function persist(entries: readonly Reminder[]) {
    try {
      await storage.write(
        JSON.stringify({ version: 1, userId: owner, entries }),
      );
    } catch {
      throw new ReminderError('storage');
    }
    publish({ entries });
  }
  function assertOwner(expected: string | null, token: number) {
    if (!expected || expected !== owner || token !== generation)
      throw new ReminderError('unavailable');
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    activate(userId: string | null) {
      const token = ++generation;
      owner = userId;
      publish({ userId, entries: [], ready: false, error: null });
      return run(async () => {
        // Always remove the old account's OS projection, even if storage cannot be read.
        await scheduler.replace(null, []);
        let stored: z.infer<typeof storedSchema> | null;
        try {
          const raw = await storage.read();
          stored = raw === null ? null : storedSchema.parse(JSON.parse(raw));
        } catch {
          throw new ReminderError('storage');
        }
        if (token !== generation) return;
        const entries =
          userId && stored?.userId === userId ? stored.entries : [];
        await persist(entries);
        await scheduler.replace(userId, entries);
        publish({ ready: true });
      });
    },
    save(input: Reminder) {
      const expected = owner,
        token = generation;
      return run(async () => {
        assertOwner(expected, token);
        if (!snapshot.ready) throw new ReminderError('unavailable');
        const parsed = reminderSchema.safeParse(input);
        if (!parsed.success) throw new ReminderError('invalid');
        const entries = snapshot.entries.filter(
          (entry) => !sameTarget(entry, input),
        );
        if (entries.length >= MAX_REMINDERS) throw new ReminderError('limit');
        if (!(await scheduler.requestPermission()))
          throw new ReminderError('permission');
        assertOwner(expected, token);
        entries.push(parsed.data);
        await persist(entries);
        await scheduler.replace(expected, entries);
      });
    },
    remove(target: ReminderTarget) {
      const expected = owner,
        token = generation;
      return run(async () => {
        assertOwner(expected, token);
        if (!snapshot.ready) throw new ReminderError('unavailable');
        const entries = snapshot.entries.filter(
          (entry) => !sameTarget(entry, target),
        );
        await persist(entries);
        await scheduler.replace(expected, entries);
      });
    },
    reset() {
      ++generation;
      owner = null;
      publish({ userId: null, ready: false, entries: [] });
      return run(async () => {
        await scheduler.replace(null, []);
        await persist([]);
        publish({ ready: true });
      });
    },
  };
}
export type ReminderService = ReturnType<typeof createReminderService>;
