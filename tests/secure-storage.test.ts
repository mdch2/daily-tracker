import { Buffer } from 'node:buffer';
import {
  createChunkedStorage,
  type SecureKeyValueStore,
} from '@/infrastructure/supabase/chunked-storage';

function fixture() {
  const data = new Map<string, string>();
  const store: SecureKeyValueStore = {
    getItem: jest.fn(async (key) => data.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      data.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      data.delete(key);
    }),
  };
  let version = 0;
  return {
    data,
    store,
    storage: createChunkedStorage(store, () => String(++version)),
  };
}

describe('encrypted session storage adapter', () => {
  it('roundtrips a large Unicode session and removes it', async () => {
    const { storage, data } = fixture();
    const session = 'a'.repeat(449) + '🌱'.repeat(1400);
    await storage.setItem('session', session);
    expect(await storage.getItem('session')).toBe(session);
    for (const value of data.values())
      expect(Buffer.byteLength(value)).toBeLessThan(2048);
    await storage.removeItem('session');
    expect(await storage.getItem('session')).toBeNull();
    expect(data.size).toBe(0);
  });
  it('keeps the previous committed session when an update fails', async () => {
    const { storage, store } = fixture();
    await storage.setItem('session', 'previous');
    jest
      .mocked(store.setItem)
      .mockRejectedValueOnce(new Error('Keychain locked'));
    await expect(storage.setItem('session', 'replacement')).rejects.toThrow(
      'Keychain locked',
    );
    expect(await storage.getItem('session')).toBe('previous');
  });
  it('reports incomplete secure data instead of returning a logged-out success', async () => {
    const { storage, data } = fixture();
    await storage.setItem('session', 'value');
    data.delete('session.1.0');
    await expect(storage.getItem('session')).rejects.toThrow('incomplete');
  });
  it('serializes concurrent writes and reads', async () => {
    const { storage } = fixture();
    await Promise.all([
      storage.setItem('session', 'first'),
      storage.setItem('session', 'last'),
    ]);
    expect(await storage.getItem('session')).toBe('last');
  });
});
