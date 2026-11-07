import { useLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { createLocalizedFormatters } from './formatters';
import { resolveFormattingLocale } from './i18n';

export function useLocalizedFormatters() {
  const { i18n } = useTranslation();
  const locales = useLocales();
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en';
  return createLocalizedFormatters(
    resolveFormattingLocale(
      language,
      locales.map((locale) => locale.languageTag),
    ),
  );
}
