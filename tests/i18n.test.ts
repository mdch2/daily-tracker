import {
  createAppI18n,
  resolveLanguage,
  resolveFormattingLocale,
  resources,
} from '@/shared/i18n/i18n';
import { createLocalizedFormatters } from '@/shared/i18n/formatters';
import { signUpSchema } from '@/features/auth/application/auth-validation';
import { validationMessage } from '@/shared/i18n/validation-message';

function entries(value: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]: [string, unknown]) => {
      const path = prefix ? prefix + '.' + key : key;
      return typeof child === 'string'
        ? [[path, child]]
        : Object.entries(entries(child as object, path));
    }),
  );
}
describe('mandatory languages', () => {
  it('detects supported regional locales and falls back to English', () => {
    expect(resolveLanguage('system', ['es-MX'])).toBe('es');
    expect(resolveLanguage('system', ['fr-FR', 'en-GB'])).toBe('en');
    expect(resolveLanguage('system', ['fr-FR'])).toBe('en');
    expect(resolveLanguage('en', ['es-CO'])).toBe('en');
    expect(resolveFormattingLocale('es', ['en-US', 'es-CO'])).toBe('es-CO');
  });
  it('has complete nonempty catalogs and matching interpolation parameters', () => {
    const en = entries(resources.en.translation);
    const es = entries(resources.es.translation);
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en)) {
      expect(es[key]?.trim()).not.toBe('');
      expect(en[key]?.trim()).not.toBe('');
      expect(es[key]?.match(/{{[^}]+}}/g) ?? []).toEqual(
        en[key]?.match(/{{[^}]+}}/g) ?? [],
      );
    }
  });
  it('uses English when a requested language is unsupported', async () => {
    const i18n = createAppI18n('es');
    await i18n.changeLanguage('fr');
    expect(i18n.t('auth.signIn')).toBe('Sign in');
  });
  it.each([
    ['es', 'Introduce un correo válido.'],
    ['en', 'Enter a valid email address.'],
  ] as const)(
    'translates application validation codes in %s',
    (language, expected) => {
      const result = signUpSchema.safeParse({
        email: 'invalid',
        password: 'long-password',
      });
      const i18n = createAppI18n(language);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(validationMessage(result.error.issues[0]?.message, i18n.t)).toBe(
          expected,
        );
    },
  );
  it('formats dates and numbers with explicit locale and timezone', () => {
    const es = createLocalizedFormatters('es-ES');
    const en = createLocalizedFormatters('en-US');
    expect(es.number(1234.5, { minimumFractionDigits: 1 })).toBe('1234,5');
    expect(en.number(1234.5, { minimumFractionDigits: 1 })).toBe('1,234.5');
    const date = new Date('2026-01-15T12:00:00Z');
    expect(es.date(date, { month: 'long', timeZone: 'UTC' })).toBe('enero');
    expect(en.date(date, { month: 'long', timeZone: 'UTC' })).toBe('January');
  });
});
