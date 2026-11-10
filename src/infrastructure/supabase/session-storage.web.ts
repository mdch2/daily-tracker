import { createBrowserStorage } from '../storage/browser-storage';

// Remember the session across tabs and browser restarts on the same origin.
// Browser storage is accessible to JavaScript and is not native encrypted storage.
export function createSessionStorage() {
  return createBrowserStorage('localStorage');
}
