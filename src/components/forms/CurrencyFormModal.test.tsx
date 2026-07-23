import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CurrencyFormModal } from './CurrencyFormModal';
import type { Currency } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  createCurrency: jest.fn(),
  updateCurrency: jest.fn(),
}));

const currency: Currency = {
  id: 'currency-1',
  code: 'SGD',
  name: 'Singapore Dollar',
  symbol: 'S$',
  isBaseCurrency: true,
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CurrencyFormModal', () => {
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onClose.mockReset();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(
      <CurrencyFormModal open={false} mode="create" onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the "Add currency" title in create mode', () => {
    renderWithProviders(<CurrencyFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add currency' })).toBeInTheDocument();
  });

  it('shows the "Edit currency" title in edit mode', () => {
    renderWithProviders(
      <CurrencyFormModal open mode="edit" currency={currency} onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.getByRole('heading', { name: 'Edit currency' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
