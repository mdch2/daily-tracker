import { createHash, randomFillSync } from 'node:crypto';
import { TextEncoder } from 'node:util';
import { Platform } from 'react-native';
import { installAuthCrypto } from '@/infrastructure/supabase/auth-crypto';
import { createSupabaseClient } from '@/infrastructure/supabase/client';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: jest.fn(async (_algorithm: string, data: Uint8Array) => {
    const hash = jest
      .requireActual('node:crypto')
      .createHash('sha256')
      .update(data)
      .digest();
    return Uint8Array.from(hash).buffer;
  }),
  getRandomValues: jest.fn((data: Uint32Array) =>
    jest.requireActual('node:crypto').randomFillSync(data),
  ),
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
const originalEncoder = globalThis.TextEncoder;
const originalFetch = globalThis.fetch;
const originalPlatform = Platform.OS;

beforeEach(() => {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  globalThis.TextEncoder = TextEncoder;
});

afterEach(() => {
  if (originalCrypto)
    Object.defineProperty(globalThis, 'crypto', originalCrypto);
  else Reflect.deleteProperty(globalThis, 'crypto');
  globalThis.TextEncoder = originalEncoder;
  globalThis.fetch = originalFetch;
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalPlatform,
  });
});

it('uses the RFC 7636 S256 vector through native crypto', async () => {
  installAuthCrypto();
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  expect(Buffer.from(hash).toString('base64url')).toBe(
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
  expect(crypto.getRandomValues(new Uint32Array(56))).toHaveLength(56);
  await expect(crypto.subtle.digest('MD5', new Uint8Array())).rejects.toThrow(
    'Unsupported',
  );
});

it('preserves existing WebCrypto and fills only missing native digest support', () => {
  const nativeRandom = randomFillSync;
  const existing = { getRandomValues: nativeRandom };
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: existing,
  });
  installAuthCrypto();
  const firstDigest = crypto.subtle.digest;
  installAuthCrypto();
  expect(crypto).toBe(existing);
  expect(crypto.getRandomValues).toBe(nativeRandom);
  expect(crypto.subtle.digest).toBe(firstDigest);
});

it('leaves web crypto untouched', () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  installAuthCrypto();
  expect(globalThis.crypto).toBeUndefined();
});

it('sends S256 PKCE through the real Supabase SDK without the WebCrypto warning', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const fetchMock = jest.fn(
    async () =>
      new Response(JSON.stringify({ id: 'synthetic-id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  globalThis.fetch = fetchMock;
  const client = createSupabaseClient({
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_synthetic_example',
  });
  try {
    const result = await client.auth.signUp({
      email: 'crypto@example.test',
      password: 'Test123!',
      options: { emailRedirectTo: 'dailytracker://callback' },
    });
    expect(result.error).toBeNull();
    const request = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    const body = JSON.parse(request.body as string);
    expect(body.code_challenge_method).toBe('s256');
    const { digest } = jest.requireMock('expo-crypto');
    const encodedVerifier = digest.mock.calls.at(-1)[1];
    expect(body.code_challenge).toBe(
      createHash('sha256').update(encodedVerifier).digest('base64url'),
    );
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('WebCrypto'));
  } finally {
    await client.auth.stopAutoRefresh();
    warn.mockRestore();
  }
});
