import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';
import { Platform } from 'react-native';

// Supabase PKCE needs secure randomness and subtle.digest, which Hermes lacks.
// Install only the missing native capabilities; preserve existing WebCrypto.
export function installAuthCrypto() {
  if (Platform.OS === 'web') return;

  const crypto = globalThis.crypto ?? {};
  if (!crypto.getRandomValues) {
    Object.defineProperty(crypto, 'getRandomValues', {
      value: getRandomValues,
    });
  }
  if (!crypto.subtle) {
    Object.defineProperty(crypto, 'subtle', {
      value: {
        digest(algorithm: string | { name: string }, data: BufferSource) {
          const name =
            typeof algorithm === 'string' ? algorithm : algorithm.name;
          if (name.toUpperCase() !== 'SHA-256') {
            return Promise.reject(
              new Error('Unsupported auth digest algorithm'),
            );
          }
          return digest(CryptoDigestAlgorithm.SHA256, data);
        },
      },
    });
  }
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: crypto,
    });
  }
}
