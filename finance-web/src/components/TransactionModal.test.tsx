// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionModal } from './TransactionModal';
const { post } = vi.hoisted(() => ({ post: vi.fn().mockResolvedValue({}) }));
vi.mock('../services/SessionContext', () => ({ useSessionApi: () => ({ post }) }));
vi.mock('../services/PreferencesContext', () => ({ usePreferences: () => ({ values: { wallets: ['Minha conta'], responsible: ['Parceiro'], incomeSources: ['Cliente'] } }) }));
afterEach(() => { cleanup(); post.mockClear(); });
it('envia o total, a parcela e os meses com as opções personalizadas', async () => {
  const done = vi.fn().mockResolvedValue(undefined); render(<TransactionModal close={vi.fn()} done={done}/>);
  fireEvent.change(screen.getByLabelText('Pagamento'), { target: { value: 'installments' } });
  fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: '10000' } });
  fireEvent.change(screen.getByLabelText('Meses a pagar'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Data da primeira parcela'), { target: { value: '2028-01-31' } });
  fireEvent.click(screen.getByText('Salvar transação'));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/transactions/installments', expect.objectContaining({ totalAmount: 100, installmentAmount: 33.33, months: 3, wallet: 'Minha conta', responsible: 'Parceiro', date: '2028-01-31' })));
  expect(done).toHaveBeenCalled();
});
it('receitas usam fonte e continuam sendo lançamentos simples', async () => {
  render(<TransactionModal close={vi.fn()} done={vi.fn().mockResolvedValue(undefined)}/>);
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'INCOME' } });
  expect(screen.getByLabelText('Fonte / pagador')).toBeTruthy(); expect(screen.queryByLabelText('Pagamento')).toBeNull();
  fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '5000' } });
  fireEvent.click(screen.getByText('Salvar transação'));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/transactions', expect.objectContaining({ type: 'INCOME', amount: 50, specification: 'Cliente' })));
});
