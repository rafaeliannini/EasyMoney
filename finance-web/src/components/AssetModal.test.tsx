// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssetModal } from './AssetModal';
const mocks = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
vi.mock('../services/SessionContext', () => ({ useSessionApi: () => mocks }));
vi.mock('../services/PreferencesContext', () => ({ usePreferences: () => ({ values: { investmentTypes: ['Caixinha'] } }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('preserva a base de juros quando apenas o nome é editado', async () => {
  render(<AssetModal asset={{ id: 1, name: 'Reserva', category: 'Caixinha', amount: 1000.50, cdiPercent: 100, lastAccruedDate: '2026-09-22' }} close={vi.fn()} done={vi.fn().mockResolvedValue(undefined)}/>);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Reserva nova' } });
  fireEvent.click(screen.getByText('Salvar investimento'));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/investments/1', expect.objectContaining({ name: 'Reserva nova', valuationDate: null, lastAccruedDate: '2026-09-22' })));
});
it('solicita uma data de saldo quando o valor é alterado', async () => {
  render(<AssetModal asset={{ id: 1, name: 'Reserva', category: 'Caixinha', amount: 1000, cdiPercent: 100, lastAccruedDate: '2026-09-22' }} close={vi.fn()} done={vi.fn().mockResolvedValue(undefined)}/>);
  fireEvent.change(screen.getByLabelText('Valor atual'), { target: { value: '2000' } });
  fireEvent.change(screen.getByLabelText(/Data do saldo informado/), { target: { value: '2026-09-23' } });
  fireEvent.click(screen.getByText('Salvar investimento'));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/investments/1', expect.objectContaining({ amount: 2000, valuationDate: '2026-09-23' })));
});
