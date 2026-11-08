jest.mock('expo-localization', () => ({
  useLocales: jest.fn(() => [{ languageTag: 'es-CO', languageCode: 'es' }]),
  getLocales: jest.fn(() => [{ languageTag: 'es-CO', languageCode: 'es' }]),
  getCalendars: jest.fn(() => [{ timeZone: 'America/Bogota' }]),
}));

// Simulate the native boundary, keeping field confirmation/cancellation in real components.
jest.mock('@/shared/ui/platform-date-time-picker', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(View, props);
  },
}));

// Font files are loaded by the native font service; behavior tests don't render glyph assets.
jest.mock('@/shared/ui/icon', () => ({ Icon: () => null }));

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
