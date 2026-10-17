jest.mock('expo-localization', () => ({
  useLocales: jest.fn(() => [{ languageTag: 'es-CO', languageCode: 'es' }]),
  getLocales: jest.fn(() => [{ languageTag: 'es-CO', languageCode: 'es' }]),
}));

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
