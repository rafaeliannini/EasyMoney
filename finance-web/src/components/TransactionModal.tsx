import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePreferences } from '../services/PreferencesContext';
import { useSessionApi } from '../services/SessionContext';

const expenseSpecs = ['Restaurantes/delivery', 'Supermercado', 'Farmácia', 'Transporte', 'Presente', 'Lazer', 'Compras pessoais', 'Viagem', 'Academia/esportes', 'Outros'];

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export function TransactionModal({ close, done }: { close: () => void; done: () => Promise<void> }) {
  const api = useSessionApi();
  const {values} = usePreferences();
  const {wallets, responsible:people, incomeSources:incomeSpecs} = values;
  const [type, setType] = useState('EXPENSE');
  const [wallet, setWallet] = useState(wallets[0]);
  const [person, setPerson] = useState(people[0]);
  const [spec, setSpec] = useState(expenseSpecs[0]);
  const [date, setDate] = useState(today);
  const [cents, setCents] = useState('');
  const [parcelled, setParcelled] = useState(false);
  const [months, setMonths] = useState(2);
  const [installment, setInstallment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const totalCents = Number(cents);
  const regularCents = installment ? Number(installment) : Math.floor(totalCents / months);
  const lastCents = totalCents - regularCents * (months - 1);
  const isInstallment = type === 'EXPENSE' && parcelled;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) { setError('Informe um valor maior que zero.'); return; }
    if (isInstallment && (!Number.isInteger(months) || months < 2 || months > 360 || regularCents <= 0 || lastCents <= 0 || Math.abs(lastCents - regularCents) > months)) {
      setError('Confira os meses e o valor da parcela: a soma deve corresponder ao total.'); return;
    }
    setSaving(true);
    try {
      const data = { date, wallet, responsible: person, specification: spec };
      if (isInstallment) await api.post('/transactions/installments', { ...data, totalAmount: totalCents / 100, installmentAmount: regularCents / 100, months });
      else await api.post('/transactions', { ...data, amount: totalCents / 100, type });
      await done();
    } catch (e) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Não foi possível salvar a transação.'); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={() => { if (!saving) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title" onMouseDown={e => e.stopPropagation()}>
    <button className="close-modal" aria-label="Fechar" disabled={saving} onClick={close}>×</button><h2 id="transaction-title">Adicionar transação</h2>
    <form onSubmit={submit}>
      <label>Tipo<select value={type} onChange={e => { setType(e.target.value); setSpec(e.target.value === 'EXPENSE' ? expenseSpecs[0] : incomeSpecs[0]); }}><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></select></label>
      <label>{type === 'INCOME' ? 'Fonte / pagador' : 'Especificação'}<select value={spec} onChange={e => setSpec(e.target.value)}>{(type === 'EXPENSE' ? expenseSpecs : incomeSpecs).map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Conta<select value={wallet} onChange={e => setWallet(e.target.value)}>{wallets.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Responsável<select value={person} onChange={e => setPerson(e.target.value)}>{people.map(x => <option key={x}>{x}</option>)}</select></label>
      {type === 'EXPENSE' && <label>Pagamento<select value={parcelled ? 'installments' : 'single'} onChange={e => setParcelled(e.target.value === 'installments')}><option value="single">À vista</option><option value="installments">Parcelado</option></select></label>}
      <label>{isInstallment ? 'Valor total' : 'Valor'}<input inputMode="numeric" value={money.format(totalCents / 100)} onChange={e => setCents(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}/></label>
      {isInstallment && <>
        <label>Meses a pagar<input type="number" min={2} max={360} required value={months} onChange={e => setMonths(Number(e.target.value))}/></label>
        <label>Valor da parcela (opcional)<input inputMode="numeric" placeholder="Calcular pelo total" value={installment ? money.format(Number(installment) / 100) : ''} onChange={e => setInstallment(e.target.value.replace(/\D/g, ''))}/></label>
        {regularCents > 0 && lastCents > 0 && <p role="status">{months - 1} parcela(s) de {money.format(regularCents / 100)} e a última de {money.format(lastCents / 100)}. As despesas serão lançadas mês a mês.</p>}
      </>}
      <label>{isInstallment ? 'Data da primeira parcela' : 'Data'}<input type="date" required value={date} onChange={e => setDate(e.target.value)}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar transação'}</button>
    </form>
  </section></div>;
}
