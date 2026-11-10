import { createBrowserStorage } from '../storage/browser-storage';

// Web sessions survive reloads in this tab, without persisting across tab closure.
// Browser storage is accessible to JavaScript and is not native encrypted storage.
export function createSessionStorage() {
  return createBrowserStorage('sessionStorage');
}
