import axios, { CanceledError } from 'axios';
import type { User } from 'firebase/auth';
import { auth } from './firebase';

export function createSessionApi(user: User, signal: AbortSignal) {
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  signal,
  headers: {
    'Content-Type': 'application/json',
  },
});

const assertSession = () => {
  if (signal.aborted || auth.currentUser !== user) throw new CanceledError('Sessão encerrada.');
};
api.interceptors.request.use(async (config) => {
  assertSession();
  const token = await user.getIdToken();
  assertSession();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => {
  return Promise.reject(error);
});
api.interceptors.response.use(response => {
  assertSession();
  return response;
});
return api;
}
