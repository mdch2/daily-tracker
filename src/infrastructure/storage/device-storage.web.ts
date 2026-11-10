import { createBrowserStorage } from './browser-storage';

// This adapter stores only non-sensitive language/theme preferences.
export const deviceStorage = createBrowserStorage('localStorage');
