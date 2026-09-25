// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { ProfileEditor } from './ProfileEditor';
const mocks = vi.hoisted(() => ({ post: vi.fn(), updateProfile: vi.fn(), verifyEmail: vi.fn(), updatePassword: vi.fn(), reauth: vi.fn(), reload: vi.fn() }));
vi.mock('../services/SessionContext', () => ({ useSessionApi: () => ({ post: mocks.post }) }));
vi.mock('firebase/auth', () => ({ updateProfile: mocks.updateProfile, verifyBeforeUpdateEmail: mocks.verifyEmail, updatePassword: mocks.updatePassword,
  reauthenticateWithCredential: mocks.reauth, reauthenticateWithPopup: mocks.reauth, reload: mocks.reload,
  GoogleAuthProvider: class {}, EmailAuthProvider: { credential: (email: string, password: string) => ({ email, password }) },
}));
const user = () => ({ email: 'old@example.com', displayName: 'Anterior', providerData: [{ providerId: 'password' }], getIdToken: vi.fn().mockResolvedValue('fresh') }) as unknown as User;
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('sincroniza o perfil somente após atualizar o Firebase e renovar o token', async () => {
  const account = user(); mocks.updateProfile.mockImplementation(async (_, value) => { Object.assign(account, { displayName: value.displayName }); });
  render(<ProfileEditor user={account} changed={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Novo nome' } });
  fireEvent.click(screen.getByText('Salvar perfil'));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/users', { name: 'Novo nome' }));
  expect(account.getIdToken).toHaveBeenCalledWith(true);
  expect(mocks.updateProfile.mock.invocationCallOrder[0]).toBeLessThan(mocks.post.mock.invocationCallOrder[0]);
});
it('troca o e-mail através de confirmação e reautenticação sem salvar o endereço pendente no banco', async () => {
  const account = user(); render(<ProfileEditor user={account} changed={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha atual (para alterar senha ou e-mail)'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByText('Salvar perfil'));
  await waitFor(() => expect(mocks.verifyEmail).toHaveBeenCalledWith(account, 'new@example.com'));
  expect(mocks.reauth).toHaveBeenCalledWith(account, { email: 'old@example.com', password: 'password123' });
  expect(mocks.post).toHaveBeenCalledWith('/users', { name: 'Anterior' });
  expect((await screen.findByRole('status')).textContent).toContain('Confirme o novo e-mail');
});
it('informa sucesso parcial quando Firebase salva mas o banco falha', async () => {
  mocks.post.mockRejectedValue(new Error('offline'));
  render(<ProfileEditor user={user()} changed={vi.fn()}/>); fireEvent.click(screen.getByText('Salvar perfil'));
  expect((await screen.findByRole('status')).textContent).toContain('Nome/foto atualizados no Firebase');
  expect(mocks.verifyEmail).not.toHaveBeenCalled(); expect(mocks.updatePassword).not.toHaveBeenCalled();
});
