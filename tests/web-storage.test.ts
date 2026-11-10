import { createPreferencesStore } from '@/shared/preferences/store';
import { deviceStorage } from '@/infrastructure/storage/device-storage.web';
import { createSessionStorage } from '@/infrastructure/supabase/session-storage.web';
import { createRuntimeReminders } from '@/bootstrap/runtime-reminders.web';
import type { i18n } from 'i18next';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

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

it('restores auth in a new tab and browser launch without changing preferences', async () => {
  const preferences = createPreferencesStore(deviceStorage);
  await preferences.getState().hydrate();
  await preferences.getState().update({ language: 'en', theme: 'dark' });
  const savedPreferences = local.data.get('daily-tracker.preferences.v1');
  const auth = createSessionStorage();
  await auth.setItem('synthetic-session', 'synthetic-token');
  session = storage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: local, sessionStorage: session },
  });
  expect(await createSessionStorage().getItem('synthetic-session')).toBe(
    'synthetic-token',
  );
  expect(local.data.get('daily-tracker.preferences.v1')).toBe(savedPreferences);
  expect(session.data.size).toBe(0);
  await auth.removeItem('synthetic-session');
  expect(await auth.getItem('synthetic-session')).toBeNull();
  expect(local.data.get('daily-tracker.preferences.v1')).toBe(savedPreferences);
  local.getItem.mockImplementationOnce(() => {
    throw new Error('Blocked');
  });
  await expect(auth.getItem('synthetic-session')).rejects.toThrow('Blocked');
});

it('does not restore a retired per-tab token after sign-out', async () => {
  session.data.set('synthetic-session', 'retired-synthetic-token');
  const auth = createSessionStorage();
  expect(await auth.getItem('synthetic-session')).toBeNull();
  await auth.setItem('synthetic-session', 'current-synthetic-token');
  await auth.removeItem('synthetic-session');
  expect(await createSessionStorage().getItem('synthetic-session')).toBeNull();
  expect(session.getItem).not.toHaveBeenCalled();
});

it('refreshes an expired persisted session through Supabase and clears it across clients on sign-out', async () => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = (expires: number) =>
    `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'synthetic-user', exp: expires })}.synthetic-signature`;
  const refreshedToken = token(Math.floor(Date.now() / 1000) + 3600);
  local.data.set(
    'synthetic-session',
    JSON.stringify({
      access_token: token(1),
      refresh_token: 'synthetic-refresh-token',
      expires_at: 1,
      token_type: 'bearer',
      user: { id: 'synthetic-user' },
    }),
  );
  const fetchMock = jest.fn(async (url: string | URL | Request) => {
    if (String(url).includes('/token?grant_type=refresh_token')) {
      return new Response(
        JSON.stringify({
          access_token: refreshedToken,
          refresh_token: 'synthetic-rotated-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'synthetic-user' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (String(url).includes('/logout'))
      return new Response('{}', { status: 200 });
    throw new Error('Unexpected synthetic auth request');
  });
  const openClient = () =>
    createClient(
      'https://session.example.test',
      'sb_publishable_synthetic_example',
      {
        auth: {
          storage: createSessionStorage(),
          storageKey: 'synthetic-session',
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
        },
        global: { fetch: fetchMock },
      },
    );
  const client = openClient();
  const reloaded = openClient();
  try {
    const first = await client.auth.getSession();
    expect(first.error).toBeNull();
    expect(first.data.session?.access_token).toBe(refreshedToken);
    expect(JSON.parse(local.data.get('synthetic-session')!).refresh_token).toBe(
      'synthetic-rotated-refresh-token',
    );
    expect((await reloaded.auth.getSession()).data.session?.user.id).toBe(
      'synthetic-user',
    );
    await client.auth.signOut({ scope: 'local' });
    expect((await reloaded.auth.getSession()).data.session).toBeNull();
    expect(session.data.size).toBe(0);
  } finally {
    await client.auth.stopAutoRefresh();
    await reloaded.auth.stopAutoRefresh();
  }
});

it('disables native reminder services on web', () => {
  expect(createRuntimeReminders({} as i18n)).toBeNull();
});
