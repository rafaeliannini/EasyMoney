import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSessionApi } from '../services/SessionContext';
import { usePreferences } from '../services/PreferencesContext';
import type { Preferences } from '../services/PreferencesContext';

const fields: [keyof Preferences, string][] = [['wallets', 'Contas'], ['responsible', 'Responsáveis'], ['incomeSources', 'Fontes / pagadores'], ['investmentTypes', 'Tipos de investimento']];
export function PreferencesForm() {
  const api = useSessionApi(); const { values, update } = usePreferences();
  const [draft, setDraft] = useState(() => Object.fromEntries(fields.map(([key]) => [key, values[key].join('\n')])) as Record<keyof Preferences, string>);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const payload = Object.fromEntries(fields.map(([key]) => [key, draft[key].split('\n').map(x => x.trim()).filter(Boolean)]));
      const response = await api.put<Preferences>('/preferences', payload); update(response.data); setMessage('✓ Opções salvas.');
    } catch (error) { setMessage((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Não foi possível salvar as opções.'); }
    finally { setBusy(false); }
  };
  return <section className="panel profile-settings"><h2>Suas opções</h2><p>Uma opção por linha. Renomear ou remover uma opção altera os próximos lançamentos; seu histórico é preservado.</p><form onSubmit={save}>
    {fields.map(([key, label]) => <label key={key}>{label}<textarea rows={5} required value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></label>)}
    <button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar opções'}</button>{message && <p role="status">{message}</p>}
  </form></section>;
}
