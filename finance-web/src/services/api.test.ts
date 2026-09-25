import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { createSessionApi } from './api';
const { auth } = vi.hoisted(() => ({ auth: { currentUser: null as User | null } }));
vi.mock('./firebase', () => ({ auth }));
const user = (uid: string) => ({ uid, getIdToken: vi.fn().mockResolvedValue(`token-${uid}`) }) as unknown as User;

describe('isolamento das requisições por sessão', () => {
  beforeEach(() => { auth.currentUser = null; });
  it('usa o token da conta proprietária', async () => {
    const owner = user('A'); auth.currentUser = owner;
    const api = createSessionApi(owner, new AbortController().signal);
    api.defaults.adapter = async config => ({ data: config.headers.Authorization, status: 200, statusText: 'OK', headers: {}, config });
    expect((await api.get('/transactions')).data).toBe('Bearer token-A');
  });
  it('não envia uma requisição antiga com o token da nova conta', async () => {
    const owner = user('A'); auth.currentUser = user('B');
    const api = createSessionApi(owner, new AbortController().signal);
    const adapter = vi.fn(); api.defaults.adapter = adapter;
    await expect(api.post('/transactions', {})).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(adapter).not.toHaveBeenCalled();
  });
  it('descarta a resposta quando a conta muda enquanto a consulta está em andamento', async () => {
    const owner = user('A'); auth.currentUser = owner;
    const api = createSessionApi(owner, new AbortController().signal);
    api.defaults.adapter = async config => {
      auth.currentUser = user('B');
      return { data: ['dados A'], status: 200, statusText: 'OK', headers: {}, config };
    };
    await expect(api.get('/transactions')).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });
  it('revalida a sessão depois de obter o token', async () => {
    const owner = user('A'); auth.currentUser = owner;
    vi.mocked(owner.getIdToken).mockImplementation(async () => { auth.currentUser = user('B'); return 'token-A'; });
    const api = createSessionApi(owner, new AbortController().signal);
    const adapter = vi.fn(); api.defaults.adapter = adapter;
    await expect(api.get('/transactions')).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(adapter).not.toHaveBeenCalled();
  });
  it('não reutiliza a sessão cancelada mesmo após entrar novamente na mesma conta', async () => {
    const owner = user('A'); auth.currentUser = owner;
    const controller = new AbortController();
    const api = createSessionApi(owner, controller.signal); controller.abort();
    await expect(api.get('/transactions')).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });
});
