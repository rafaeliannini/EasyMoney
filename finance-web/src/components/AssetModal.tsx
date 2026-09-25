import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSessionApi } from '../services/SessionContext';
import { usePreferences } from '../services/PreferencesContext';
export type Investment = { id: number; name: string; category: string; amount: number; goal?: number | null; cdiPercent?: number | null; lastAccruedDate?: string | null };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export function AssetModal({ asset, close, done }: { asset: Investment | null; close: () => void; done: () => Promise<void> }) {
  const api = useSessionApi(); const { values } = usePreferences();
  const types = asset && !values.investmentTypes.includes(asset.category) ? [asset.category, ...values.investmentTypes] : values.investmentTypes;
  const [name, setName] = useState(asset?.name || ''); const [category, setCategory] = useState(asset?.category || types[0]);
  const [amount, setAmount] = useState(String(asset?.amount ?? '')); const [goal, setGoal] = useState(String(asset?.goal ?? ''));
  const [automatic, setAutomatic] = useState(!!asset?.cdiPercent); const [percent, setPercent] = useState(String(asset?.cdiPercent ?? 100));
  const [date, setDate] = useState(today); const [reset, setReset] = useState(false);
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const needsDate = automatic && (reset || !asset?.cdiPercent || Number(amount) !== Number(asset.amount) || Number(percent) !== Number(asset.cdiPercent));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { name, category, amount: Number(amount), goal: goal ? Number(goal) : null, cdiPercent: automatic ? Number(percent) : null, valuationDate: needsDate ? date : null, lastAccruedDate: asset?.lastAccruedDate ?? null };
      if (asset) await api.put(`/investments/${asset.id}`, payload); else await api.post('/investments', payload);
      await done();
    } catch (error) {
      const response = (error as { response?: { status: number; data?: { message?: string } } }).response;
      setError(response?.status === 409 ? 'O rendimento foi atualizado. Feche, atualize a página e tente novamente.' : response?.data?.message || 'Confira os valores e tente novamente.');
    } finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={() => { if (!saving) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="asset-title" onMouseDown={e => e.stopPropagation()}>
    <button className="close-modal" aria-label="Fechar" disabled={saving} onClick={close}>×</button><h2 id="asset-title">{asset ? 'Editar investimento' : 'Adicionar investimento'}</h2>
    <form onSubmit={submit}>
      <label>Nome<input value={name} maxLength={120} onChange={e => setName(e.target.value)} required/></label>
      <label>Tipo<select value={category} onChange={e => setCategory(e.target.value)}>{types.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Valor atual<input type="number" min={0} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <label>Meta (opcional)<input type="number" min={0} step="0.01" value={goal} onChange={e => setGoal(e.target.value)}/></label>
      <label>Atualização do valor<select value={automatic ? 'cdi' : 'manual'} onChange={e => setAutomatic(e.target.value === 'cdi')}><option value="manual">Manual</option><option value="cdi">Renda fixa / caixinha vinculada ao CDI</option></select></label>
      {automatic && <>
        <label>Percentual do CDI<input type="number" min="0.01" max={1000} step="0.01" required value={percent} onChange={e => setPercent(e.target.value)}/></label>
        <p>Estimativa bruta, sem impostos ou taxas. Atualizada automaticamente com as taxas diárias publicadas pelo Banco Central.</p>
        {asset?.cdiPercent && <button type="button" className="text-button" onClick={() => setReset(value => !value)}>{reset ? 'Manter data anterior' : 'Informar nova data do saldo'}</button>}
        {needsDate && <label>Data do saldo informado<input type="date" required max={today()} value={date} onChange={e => setDate(e.target.value)}/><span>O rendimento começa nas datas publicadas após este dia.</span></label>}
      </>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar investimento'}</button>
    </form>
  </section></div>;
}
