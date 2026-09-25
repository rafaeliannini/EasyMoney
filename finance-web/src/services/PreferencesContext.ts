import { createContext, useContext } from 'react';
export type Preferences = { wallets: string[]; responsible: string[]; incomeSources: string[]; investmentTypes: string[] };
export const PreferencesContext = createContext<{ values: Preferences; update: (values: Preferences) => void } | null>(null);
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('Preferências indisponíveis.');
  return context;
}
