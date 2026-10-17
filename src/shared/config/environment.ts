import { z } from 'zod';

const environmentSchema = z.object({
  url: z.url().refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname))
      );
    } catch {
      return false;
    }
  }),
  publishableKey: z.string().startsWith('sb_publishable_').min(20),
});

export type Environment = z.infer<typeof environmentSchema>;

// Never include values or Zod errors in user-facing messages: input may contain a secret.
export function parseEnvironment(input: unknown): Environment | null {
  const result = environmentSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function readEnvironment() {
  return parseEnvironment({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
