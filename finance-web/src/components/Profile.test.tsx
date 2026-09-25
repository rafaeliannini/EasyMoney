// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { Profile } from './Profile';
vi.mock('./PreferencesForm', () => ({ PreferencesForm: () => null }));
vi.mock('./ProfileEditor', () => ({ ProfileEditor: () => null }));
const { passwordLink, googleLink, credential } = vi.hoisted(() => ({ passwordLink: vi.fn(), googleLink: vi.fn(), credential: vi.fn() }));
vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential }, GoogleAuthProvider: class {}, linkWithCredential: passwordLink, linkWithPopup: googleLink,
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const account = (providerId: string) => ({ uid: 'original', email: 'teste@example.com', providerData: [{ providerId }] }) as User;
describe('vinculação de acesso', () => {
  it('adiciona senha à conta Google existente', async () => {
    const user = account('google.com');
    credential.mockReturnValue('credential');
    passwordLink.mockImplementation(async () => { user.providerData.push({ providerId: 'password' } as User['providerData'][number]); });
    render(<Profile user={user}/>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByText('Adicionar acesso com senha'));
    await waitFor(() => expect(passwordLink).toHaveBeenCalledWith(user, 'credential'));
    expect(credential).toHaveBeenCalledWith('teste@example.com', 'senha123');
    await screen.findByText('E-mail e senha: vinculado');
  });
  it('vincula Google ao usuário autenticado e explica conflito entre contas', async () => {
    const user = account('password'); googleLink.mockRejectedValue({ code: 'auth/credential-already-in-use' });
    render(<Profile user={user}/>);
    fireEvent.click(screen.getByText('Vincular Google'));
    await waitFor(() => expect(googleLink).toHaveBeenCalledWith(user, expect.anything()));
    expect((await screen.findByRole('status')).textContent).toContain('já pertence a outra conta');
  });
  it('não vincula senhas cuja confirmação é diferente', () => {
    render(<Profile user={account('google.com')}/>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'outrasenha' } });
    fireEvent.click(screen.getByText('Adicionar acesso com senha'));
    expect(passwordLink).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('confirme a mesma senha');
  });
});
