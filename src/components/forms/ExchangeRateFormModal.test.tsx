import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ExchangeRateFormModal } from './ExchangeRateFormModal';
import type { ExchangeRate } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn().mockResolvedValue({ currencies: [], totalCount: 0 }),
}));

jest.mock('../../lib/api/exchangeRates.api', () => ({
  createExchangeRate: jest.fn(),
  updateExchangeRate: jest.fn(),
}));

const exchangeRate: ExchangeRate = {
  id: 'rate-1',
  fromCurrency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  toCurrency: { id: 'currency-2', code: 'USD', symbol: '$' },
  rate: 0.74,
  effectiveDate: '2025-01-01',
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ExchangeRateFormModal', () => {
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onClose.mockReset();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(<ExchangeRateFormModal open={false} mode="create" onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the "Add exchange rate" title in create mode', () => {
    renderWithProviders(<ExchangeRateFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add exchange rate' })).toBeInTheDocument();
  });

  it('shows the "Edit exchange rate" title in edit mode', () => {
    renderWithProviders(
      <ExchangeRateFormModal open mode="edit" exchangeRate={exchangeRate} onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.getByRole('heading', { name: 'Edit exchange rate' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExchangeRateFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExchangeRateFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
