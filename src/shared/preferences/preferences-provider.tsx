import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react';
import { useStore } from 'zustand';
import type { PreferencesStore } from './store';

const PreferencesContext = createContext<PreferencesStore | null>(null);

export function PreferencesProvider({
  store,
  children,
}: PropsWithChildren<{ store: PreferencesStore }>) {
  useEffect(() => {
    if (store.getState().status === 'loading') void store.getState().hydrate();
  }, [store]);
  return (
    <PreferencesContext.Provider value={store}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const store = useContext(PreferencesContext);
  if (!store) throw new Error('PreferencesProvider is missing.');
  return useStore(store);
}
