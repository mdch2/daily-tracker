import { Platform, AppState } from 'react-native';
import { getAuthRedirectUrl } from '@/features/auth/infrastructure/auth-redirect';
import { createAuthRepository } from '@/features/auth/infrastructure/supabase-auth-repository';
import {
  observeAuthLifecycle,
  type BackendClient,
} from '@/infrastructure/supabase/client';
import { deviceStorage } from '@/infrastructure/storage/device-storage';
import * as SecureStore from 'expo-secure-store';

it('uses the current web origin and preserves the native callback', () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { origin: 'https://tracker.example.test' } },
    });
    expect(getAuthRedirectUrl()).toBe('https://tracker.example.test/callback');
    platform.replaceValue('android');
    expect(getAuthRedirectUrl()).toBe('dailytracker://callback');
  } finally {
    platform.restore();
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

it('passes web callbacks to registration and password recovery', async () => {
  const signUp = jest.fn(async () => ({
    data: { session: null },
    error: null,
  }));
  const resetPasswordForEmail = jest.fn(async () => ({ error: null }));
  const repository = createAuthRepository(
    { auth: { signUp, resetPasswordForEmail } } as unknown as BackendClient,
    () => 'https://tracker.example.test/callback',
  );
  await repository.signUp({
    email: 'user@example.test',
    password: 'Synthetic123!',
  });
  await repository.requestPasswordReset('user@example.test');
  expect(signUp).toHaveBeenCalledWith(
    expect.objectContaining({
      options: { emailRedirectTo: 'https://tracker.example.test/callback' },
    }),
  );
  expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.test', {
    redirectTo: 'https://tracker.example.test/callback?mode=recovery',
  });
});

it('lets Supabase manage browser visibility instead of installing native refresh listeners', () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  const listener = jest.spyOn(AppState, 'addEventListener');
  try {
    expect(observeAuthLifecycle({} as BackendClient)).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  } finally {
    platform.restore();
    listener.mockRestore();
  }
});

it('propagates native secure storage failures without an unencrypted fallback', async () => {
  const read = jest
    .spyOn(SecureStore, 'getItemAsync')
    .mockRejectedValueOnce(new Error('Locked'));
  try {
    await expect(deviceStorage.getItem('synthetic-key')).rejects.toThrow(
      'Locked',
    );
  } finally {
    read.mockRestore();
  }
});
