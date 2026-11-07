import { parseEnvironment } from '@/shared/config/environment';

const publicKey = 'sb_publishable_synthetic_example';
describe('public environment', () => {
  it('starts without configuration rather than inventing credentials', () => {
    expect(parseEnvironment({})).toBeNull();
    expect(
      parseEnvironment({ url: 'not-a-url', publishableKey: publicKey }),
    ).toBeNull();
  });
  it('rejects privileged keys and insecure remote transport', () => {
    expect(
      parseEnvironment({
        url: 'https://example.supabase.co',
        publishableKey: 'sb_secret_synthetic_example',
      }),
    ).toBeNull();
    expect(
      parseEnvironment({
        url: 'http://example.supabase.co',
        publishableKey: publicKey,
      }),
    ).toBeNull();
  });
  it('accepts HTTPS and the Android emulator loopback', () => {
    expect(
      parseEnvironment({
        url: 'https://example.supabase.co',
        publishableKey: publicKey,
      }),
    ).not.toBeNull();
    expect(
      parseEnvironment({
        url: 'http://10.0.2.2:54321',
        publishableKey: publicKey,
      }),
    ).not.toBeNull();
  });
});
