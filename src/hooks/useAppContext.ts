import { createContext, useContext } from 'react';
import type { AppContextValue } from '../@types/AppContextValue';

export const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
