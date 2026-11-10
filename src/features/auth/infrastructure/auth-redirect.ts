import { Platform } from 'react-native';

export function getAuthRedirectUrl() {
  return Platform.OS === 'web'
    ? new URL('/callback', window.location.origin).href
    : 'dailytracker://callback';
}
