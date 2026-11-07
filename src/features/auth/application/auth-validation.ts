import { z } from 'zod';
import type { AuthRepository } from '../domain/auth-repository';

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, 'validation.emailTooLong')
    .pipe(z.email('validation.email')),
});
export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'validation.passwordMin')
    .max(128, 'validation.passwordMax'),
});
export const signInSchema = emailSchema.extend({
  password: z
    .string()
    .min(1, 'validation.passwordRequired')
    .max(128, 'validation.passwordMax'),
});
export const signUpSchema = emailSchema.extend(passwordSchema.shape);
export type AuthFormValues = z.infer<typeof signInSchema>;

// Validate again at the application boundary, even when called outside a form.
export function createAuthActions(repository: AuthRepository) {
  return {
    signIn: (input: unknown) => repository.signIn(signInSchema.parse(input)),
    signUp: (input: unknown) => repository.signUp(signUpSchema.parse(input)),
    requestPasswordReset: (input: unknown) =>
      repository.requestPasswordReset(emailSchema.parse(input).email),
    updatePassword: (input: unknown) =>
      repository.updatePassword(passwordSchema.parse(input).password),
  };
}
