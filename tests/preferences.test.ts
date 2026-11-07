import {
  createPreferencesStore,
  preferenceStorageKey,
  type PreferenceStorage,
} from '@/shared/preferences/store';

function memoryStorage() {
  const data = new Map<string, string>();
  const storage: PreferenceStorage = {
    getItem: jest.fn(async (key) => data.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      data.set(key, value);
    }),
  };
  return { storage, data };
}
describe('persistent device preferences', () => {
  it('defaults to system preferences on first launch', async () => {
    const { storage } = memoryStorage();
    const store = createPreferencesStore(storage);
    await store.getState().hydrate();
    expect(store.getState().values).toEqual({
      language: 'system',
      theme: 'system',
    });
  });
  it.each(['system', 'es', 'en'] as const)(
    'restores language %s after a new launch',
    async (language) => {
      const { storage } = memoryStorage();
      const store = createPreferencesStore(storage);
      await store.getState().hydrate();
      await store.getState().update({ language });
      const relaunched = createPreferencesStore(storage);
      await relaunched.getState().hydrate();
      expect(relaunched.getState().values.language).toBe(language);
    },
  );
  it.each(['system', 'light', 'dark'] as const)(
    'restores theme %s after a new launch',
    async (theme) => {
      const { storage } = memoryStorage();
      const store = createPreferencesStore(storage);
      await store.getState().hydrate();
      await store.getState().update({ theme });
      const relaunched = createPreferencesStore(storage);
      await relaunched.getState().hydrate();
      expect(relaunched.getState().values.theme).toBe(theme);
    },
  );
  it('preserves active settings when saving fails', async () => {
    const { storage } = memoryStorage();
    const store = createPreferencesStore(storage);
    await store.getState().hydrate();
    jest.mocked(storage.setItem).mockRejectedValueOnce(new Error('Locked'));
    await expect(
      store.getState().update({ language: 'en', theme: 'dark' }),
    ).rejects.toThrow();
    expect(store.getState().values).toEqual({
      language: 'system',
      theme: 'system',
    });
    expect(store.getState().error).toBe('save');
    await store.getState().update({ theme: 'light' });
    expect(store.getState().values.theme).toBe('light');
  });
  it('reports invalid stored preferences and permits recovery', async () => {
    const { storage, data } = memoryStorage();
    data.set(preferenceStorageKey, '{"language":"invalid"}');
    const store = createPreferencesStore(storage);
    await store.getState().hydrate();
    expect(store.getState().status).toBe('error');
    data.delete(preferenceStorageKey);
    await store.getState().hydrate();
    expect(store.getState().status).toBe('ready');
  });
  it('does not lose either preference during concurrent writes', async () => {
    const { storage } = memoryStorage();
    const store = createPreferencesStore(storage);
    await store.getState().hydrate();
    await Promise.all([
      store.getState().update({ language: 'en' }),
      store.getState().update({ theme: 'dark' }),
    ]);
    expect(store.getState().values).toEqual({ language: 'en', theme: 'dark' });
  });
});
