// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import App from './App';

const mocks = vi.hoisted(() => ({ listener: null as ((user: User | null) => void) | null, clients: new Map(), auth: { currentUser: null as User | null } }));
vi.mock('./services/firebase', () => ({ auth: mocks.auth }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_: unknown, listener: (user: User | null) => void) => { mocks.listener = listener; return () => { mocks.listener = null; }; },
  GoogleAuthProvider: class {}, signOut: vi.fn(), createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(), signInWithPopup: vi.fn(), updateProfile: vi.fn(),
}));
vi.mock('./components/Profile', () => ({ Profile: () => null }));
vi.mock('./services/api', () => ({ createSessionApi: (user: User, signal: AbortSignal) => { const client = mocks.clients.get(user.uid); client.signal = signal; return client; } }));
const options = { wallets: ['Conta'], responsible: ['Eu'], incomeSources: ['Salário'], investmentTypes: ['Caixinha'] };
const transaction = (description: string) => ({ id: 1, description, type: 'EXPENSE', amount: 19, date: '2020-01-01' });
function client(data: unknown[]) {
  return { signal: null as AbortSignal | null, post: vi.fn().mockResolvedValue({}), get: vi.fn(async (path: string): Promise<{ data: unknown }> => ({ data: path === '/preferences' ? options : path === '/transactions' ? data : path === '/investments' ? [] : { monthly: [], categories: [], responsible: [], sources: [], daily: [] } })) };
}
function login(uid: string | null) {
  const user = uid ? { uid, email: `${uid}@example.com` } as User : null;
  act(() => { mocks.auth.currentUser = user; mocks.listener!(user); });
}
beforeEach(() => { history.replaceState({}, '', '/'); mocks.clients.clear(); });
afterEach(cleanup);
describe('troca de contas', () => {
  it('apaga dados e formulários da conta anterior sem recarregar a página', async () => {
    const a = client([transaction('Compra privada A')]), b = client([]); mocks.clients.set('a', a); mocks.clients.set('b', b);
    render(<App/>); login('a'); await screen.findByText('Compra privada A');
    fireEvent.click(screen.getByText('+ Nova transação')); expect(screen.getByRole('dialog')).toBeTruthy();
    login('b');
    expect(screen.queryByText('Compra privada A')).toBeNull(); expect(screen.queryByRole('dialog')).toBeNull();
    expect(a.signal?.aborted).toBe(true);
    await screen.findByText('Nenhuma transação ainda. Adicione a primeira para ver seu resumo.');
  });
  it('aguarda criar o usuário no banco antes de consultar seus dados', async () => {
    let release!: () => void;
    const a = client([]); a.post.mockImplementation(() => new Promise<void>(resolve => { release = resolve; })); mocks.clients.set('a', a);
    render(<App/>); login('a');
    expect(a.get).not.toHaveBeenCalled();
    await act(async () => release());
    await waitFor(() => expect(a.get).toHaveBeenCalledWith('/transactions'));
  });
  it('descarta resultados antigos que terminam depois do login na outra conta', async () => {
    let release!: (value: {data: unknown}) => void;
    const a = client([]), b = client([transaction('Compra B')]);
    const original = a.get.getMockImplementation()!;
    a.get.mockImplementation(path => path === '/transactions' ? new Promise(resolve => { release = resolve; }) : original(path));
    mocks.clients.set('a', a); mocks.clients.set('b', b); render(<App/>); login('a');
    await waitFor(() => expect(a.get).toHaveBeenCalledWith('/transactions'));
    login('b'); await screen.findByText('Compra B');
    await act(async () => release({ data: [transaction('Dados atrasados A')] }));
    expect(screen.queryByText('Dados atrasados A')).toBeNull(); expect(screen.getByText('Compra B')).toBeTruthy();
  });
});
