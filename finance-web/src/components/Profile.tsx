import { PreferencesForm } from './PreferencesForm';
import { ProfileEditor } from './ProfileEditor';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmailAuthProvider, GoogleAuthProvider, linkWithCredential, linkWithPopup } from 'firebase/auth';
import type { User } from 'firebase/auth';

export function Profile({ user }: { user: User }) {
  const [, refresh] = useState(0);
  const [providers, setProviders] = useState(() => user.providerData.map(item => item.providerId));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const link = async (method: 'google' | 'password') => {
    setMessage('');
    if (method === 'password' && (password.length < 6 || password !== confirmation)) {
      setMessage('Informe uma senha com pelo menos 6 caracteres e confirme a mesma senha.');
      return;
    }
    setBusy(true);
    try {
      if (method === 'google') await linkWithPopup(user, new GoogleAuthProvider());
      else {
        if (!user.email) throw new Error('E-mail indisponível.');
        await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
      }
      setProviders(user.providerData.map(item => item.providerId));
      setPassword(''); setConfirmation('');
      setMessage('✓ Acesso vinculado. Você pode entrar pelos dois métodos e acessar os mesmos dados.');
    } catch (error) {
      const code = (error as { code?: string }).code;
      setMessage(code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use'
        ? 'Esse acesso já pertence a outra conta. Entre na conta original; os dados de contas separadas não são mesclados.'
        : code === 'auth/requires-recent-login'
          ? 'Saia e entre novamente antes de vincular um novo acesso.'
          : code === 'auth/popup-closed-by-user' ? 'Vinculação cancelada. Tente novamente quando quiser.'
            : 'Não foi possível vincular o acesso. Confira os dados e tente novamente.');
    } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void link('password'); };
  return <section className="profile-card">
    <p className="eyebrow">Minha conta</p><h1>Perfil</h1>
    {user.photoURL ? <img className="avatar" src={user.photoURL} alt="Foto do perfil" referrerPolicy="no-referrer"/> : <div className="avatar">{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</div>}
    <h2>{user.displayName || 'Usuário EasyMoney'}</h2><p>{user.email}</p>
    <section className="panel profile-settings"><h2>Formas de acesso</h2>
      <p>Vincule os acessos aqui para manter suas transações e investimentos na mesma conta.</p>
      <p>Google: {providers.includes('google.com') ? 'vinculado' : 'não vinculado'}</p>
      {!providers.includes('google.com') && <button className="google-button" disabled={busy} onClick={() => void link('google')}>Vincular Google</button>}
      <p>E-mail e senha: {providers.includes('password') ? 'vinculado' : 'não vinculado'}</p>
      {!providers.includes('password') && user.email && <form onSubmit={submit}>
        <p>Defina uma senha para entrar com {user.email}.</p>
        <label>Nova senha<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)}/></label>
        <label>Confirmar senha<input type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label>
        <button className="primary-button" disabled={busy}>Adicionar acesso com senha</button>
      </form>}
      {message && <p role="status">{message}</p>}
    </section>
    <ProfileEditor user={user} changed={() => refresh(value => value + 1)}/>
    <PreferencesForm/>
  </section>;
}
