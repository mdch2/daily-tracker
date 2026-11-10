import { createPreferencesStore } from '@/shared/preferences/store';
import { deviceStorage } from '@/infrastructure/storage/device-storage.web';
import { createSessionStorage } from '@/infrastructure/supabase/session-storage.web';
import { createRuntimeReminders } from '@/bootstrap/runtime-reminders.web';
import type { i18n } from 'i18next';

function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: jest.fn((key: string) => data.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      data.delete(key);
    }),
  };
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
let local: ReturnType<typeof storage>;
let session: ReturnType<typeof storage>;
beforeEach(() => {
  local = storage();
  session = storage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: local, sessionStorage: session },
  });
});
afterAll(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

it('boots web with system preferences and restores language/theme after a reload', async () => {
  const store = createPreferencesStore(deviceStorage);
  await store.getState().hydrate();
  expect(store.getState().status).toBe('ready');
  expect(store.getState().values).toEqual({
    language: 'system',
    theme: 'system',
  });
  await store.getState().update({ language: 'en', theme: 'dark' });
  const reloaded = createPreferencesStore(deviceStorage);
  await reloaded.getState().hydrate();
  expect(reloaded.getState().values).toEqual({ language: 'en', theme: 'dark' });
  expect(session.data.size).toBe(0);
});

it('reports blocked browser storage and supports retry without overwriting data', async () => {
  local.getItem.mockImplementationOnce(() => {
    throw new Error('Blocked');
  });
  const store = createPreferencesStore(deviceStorage);
  await store.getState().hydrate();
  expect(store.getState().status).toBe('error');
  expect(local.setItem).not.toHaveBeenCalled();
  await store.getState().hydrate();
  expect(store.getState().status).toBe('ready');
  local.setItem.mockImplementationOnce(() => {
    throw new Error('Quota');
  });
  await expect(store.getState().update({ language: 'en' })).rejects.toThrow();
  expect(store.getState().values.language).toBe('system');
  expect(store.getState().error).toBe('save');
});

it('keeps session data out of persistent preferences and removes it at sign-out', async () => {
  const auth = createSessionStorage();
  await auth.setItem('synthetic-session', 'synthetic-token');
  expect(await createSessionStorage().getItem('synthetic-session')).toBe(
    'synthetic-token',
  );
  expect(local.data.size).toBe(0);
  await auth.removeItem('synthetic-session');
  expect(await auth.getItem('synthetic-session')).toBeNull();
  session.getItem.mockImplementationOnce(() => {
    throw new Error('Blocked');
  });
  await expect(auth.getItem('synthetic-session')).rejects.toThrow('Blocked');
});

it('disables native reminder services on web', () => {
  expect(createRuntimeReminders({} as i18n)).toBeNull();
});
