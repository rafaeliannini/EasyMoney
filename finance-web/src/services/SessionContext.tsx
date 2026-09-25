import { createContext, useContext } from 'react';
import type { AxiosInstance } from 'axios';

export const SessionContext = createContext<AxiosInstance | null>(null);
export function useSessionApi() {
  const api = useContext(SessionContext);
  if (!api) throw new Error('Sessão indisponível.');
  return api;
}
