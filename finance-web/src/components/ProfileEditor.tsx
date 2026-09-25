import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, reload, updatePassword, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { useSessionApi } from '../services/SessionContext';

export function ProfileEditor({ user, changed }: { user: User; changed: () => void }) {
  const api = useSessionApi();
  const [name, setName] = useState(user.displayName || '');
  const [photo, setPhoto] = useState(user.photoURL || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const hasPassword = user.providerData.some(p => p.providerId === 'password');
  const sync = async () => { await user.getIdToken(true); await api.post('/users', { name: user.displayName }); changed(); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    if (password && (password.length < 6 || password !== confirmation)) { setMessage('Confirme a nova senha com pelo menos 6 caracteres.'); return; }
    if (photo && (!photo.startsWith('https://') || photo.length > 2048)) { setMessage('Informe uma URL HTTPS válida para a foto.'); return; }
    setBusy(true);
    let savedProfile = false, savedPassword = false, pendingEmail = false;
    try {
      if (password || email !== user.email) {
        if (hasPassword && user.email) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
        else await reauthenticateWithPopup(user, new GoogleAuthProvider());
      }
      await updateProfile(user, { displayName: name.trim(), photoURL: photo.trim() || null }); savedProfile = true;
      await sync();
      if (password) { await updatePassword(user, password); savedPassword = true; setPassword(''); setConfirmation(''); }
      if (email !== user.email) { await verifyBeforeUpdateEmail(user, email.trim()); pendingEmail = true; }
      setMessage(`✓ Perfil salvo.${savedPassword ? ' Senha alterada.' : ''}${pendingEmail ? ' Confirme o novo e-mail pelo link recebido e clique em Atualizar conta.' : ''}`);
      setCurrentPassword('');
    } catch (error) {
      const code = (error as { code?: string }).code;
      setMessage(`${savedProfile ? 'Nome/foto atualizados no Firebase. ' : ''}${savedPassword ? 'Senha alterada. ' : ''}${pendingEmail ? 'Verificação de e-mail enviada. ' : ''}${code === 'auth/requires-recent-login' ? 'Entre novamente para concluir.' : 'Não foi possível concluir todas as alterações. Confira seus dados; use Atualizar conta para sincronizar o perfil.'}`);
    } finally { changed(); setBusy(false); }
  };
  const refresh = async () => {
    setBusy(true); setMessage('');
    try { await reload(user); await sync(); setEmail(user.email || ''); setMessage('✓ Conta atualizada e sincronizada.'); }
    catch { setMessage('Não foi possível sincronizar. Entre novamente com seu e-mail atual.'); }
    finally { setBusy(false); }
  };
  return <section className="panel profile-settings"><h2>Dados pessoais</h2><form onSubmit={save}>
    <label>Nome<input required maxLength={120} value={name} onChange={e => setName(e.target.value)}/></label>
    <label>Foto (URL HTTPS)<input type="url" maxLength={2048} value={photo} onChange={e => setPhoto(e.target.value)} placeholder="https://…"/></label>
    <p>Deixe a foto em branco para removê-la.</p>
    <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>
    {hasPassword && <>
      <label>Nova senha (opcional)<input type="password" autoComplete="new-password" minLength={6} value={password} onChange={e => setPassword(e.target.value)}/></label>
      <label>Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label>
      <label>Senha atual (para alterar senha ou e-mail)<input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}/></label>
    </>}
    <button className="primary-button" disabled={busy}>Salvar perfil</button>
    <button type="button" className="text-button" disabled={busy} onClick={() => void refresh()}>Atualizar conta</button>
    {message && <p role="status">{message}</p>}
  </form></section>;
}
