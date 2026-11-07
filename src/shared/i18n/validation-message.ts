import type { TFunction } from 'i18next';
const validationKeys = [
  'validation.email',
  'validation.emailTooLong',
  'validation.passwordRequired',
  'validation.passwordMin',
  'validation.passwordMax',
  'validation.invalid',
] as const;
type ValidationKey = (typeof validationKeys)[number];
export function validationMessage(message: string | undefined, t: TFunction) {
  if (!message) return undefined;
  return t(
    validationKeys.includes(message as ValidationKey)
      ? (message as ValidationKey)
      : 'validation.invalid',
  );
}
