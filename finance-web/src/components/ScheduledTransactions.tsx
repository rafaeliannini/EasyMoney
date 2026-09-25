type Item = { id: number; date: string; amount: number; description: string; specification?: string; installmentNumber?: number; installmentCount?: number };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function ScheduledTransactions({ items }: { items: Item[] }) {
  if (!items.length) return null;
  return <section className="panel"><h2>Próximos lançamentos</h2><p>Entram no saldo e nas análises na data do lançamento.</p>
    <details><summary>Ver {items.length} lançamento(s) agendado(s)</summary>
      {[...items].sort((a,b) => a.date.localeCompare(b.date)).map(item => <article className="transaction-row" key={item.id}>
        <div className="transaction-info"><strong>{item.specification || item.description}</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}{item.installmentCount ? ` · Parcela ${item.installmentNumber}/${item.installmentCount}` : ''}</span></div>
        <strong>{money.format(item.amount)}</strong>
      </article>)}
    </details>
  </section>;
}
