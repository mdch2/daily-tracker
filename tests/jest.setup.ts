jest.mock('expo-localization', () => ({
  useLocales: jest.fn(() => [{ languageTag: 'es-CO', languageCode: 'es' }]),
  getLocales: jest.fn(() => [{ languageTag: 'es-CO', languageCode: 'es' }]),
}));

// Font files are loaded by the native font service; behavior tests don't render glyph assets.
jest.mock('@/shared/ui/icon', () => ({ Icon: () => null }));

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
