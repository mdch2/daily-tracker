export interface SecureKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

type Manifest = { version: string; count: number };
const chunkLength = 450; // At most 1800 UTF-8 bytes, below historical iOS limits.
const maxChunks = 256;

// Each chunk stays encrypted by SecureStore. The manifest is committed last.
export function createChunkedStorage(
  store: SecureKeyValueStore,
  newId: () => string,
) {
  let pending: Promise<unknown> = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };
  const manifestKey = (key: string) => `${key}.manifest`;
  const chunkKey = (key: string, manifest: Manifest, index: number) =>
    `${key}.${manifest.version}.${index}`;
  async function readManifest(key: string): Promise<Manifest | null> {
    const raw = await store.getItem(manifestKey(key));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      !('count' in parsed) ||
      typeof parsed.version !== 'string' ||
      !/^[a-zA-Z0-9-]+$/.test(parsed.version) ||
      typeof parsed.count !== 'number' ||
      !Number.isInteger(parsed.count) ||
      parsed.count < 1 ||
      parsed.count > maxChunks
    ) {
      throw new Error('Secure session metadata is invalid.');
    }
    return { version: parsed.version, count: parsed.count };
  }
  async function removeChunks(key: string, manifest: Manifest) {
    for (let index = 0; index < manifest.count; index++) {
      await store.removeItem(chunkKey(key, manifest, index));
    }
  }
  return {
    getItem: (key: string) =>
      serialize(async () => {
        const manifest = await readManifest(key);
        if (!manifest) return null;
        const chunks: string[] = [];
        for (let index = 0; index < manifest.count; index++) {
          const chunk = await store.getItem(chunkKey(key, manifest, index));
          if (chunk === null) throw new Error('Secure session is incomplete.');
          chunks.push(chunk);
        }
        return chunks.join('');
      }),
    setItem: (key: string, value: string) =>
      serialize(async () => {
        const previous = await readManifest(key);
        const characters = Array.from(value);
        const manifest = {
          version: newId(),
          count: Math.max(1, Math.ceil(characters.length / chunkLength)),
        };
        if (manifest.count > maxChunks)
          throw new Error('Secure session is too large.');
        try {
          for (let index = 0; index < manifest.count; index++) {
            await store.setItem(
              chunkKey(key, manifest, index),
              characters
                .slice(index * chunkLength, (index + 1) * chunkLength)
                .join(''),
            );
          }
          await store.setItem(manifestKey(key), JSON.stringify(manifest));
        } catch (error) {
          await removeChunks(key, manifest).catch(() => undefined);
          throw error;
        }
        // A committed session remains valid if cleanup fails; encrypted orphan chunks
        // can survive a device interruption. No plaintext fallback is allowed.
        if (previous) await removeChunks(key, previous).catch(() => undefined);
      }),
    removeItem: (key: string) =>
      serialize(async () => {
        const manifest = await readManifest(key);
        if (manifest) await removeChunks(key, manifest);
        await store.removeItem(manifestKey(key));
      }),
  };
}
