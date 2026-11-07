import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export type Language = 'en' | 'es';
export const resources = { en: { translation: en }, es: { translation: es } };

export function resolveLanguage(
  preference: Language | 'system',
  deviceTags: readonly string[],
): Language {
  if (preference !== 'system') return preference;
  for (const tag of deviceTags) {
    const language = tag.split('-')[0]?.toLowerCase();
    if (language === 'es' || language === 'en') return language;
  }
  return 'en';
}

export function resolveFormattingLocale(
  language: Language,
  deviceTags: readonly string[],
) {
  return (
    deviceTags.find((tag) => tag.split('-')[0]?.toLowerCase() === language) ??
    language
  );
}

export function createAppI18n(language: Language) {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['es', 'en'],
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
    returnNull: false;
  }
}
