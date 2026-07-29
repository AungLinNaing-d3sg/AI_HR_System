import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CurrencyForm } from './CurrencyForm';
import type { Currency } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  createCurrency: jest.fn(),
  updateCurrency: jest.fn(),
}));

const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as {
  createCurrency: jest.Mock;
  updateCurrency: jest.Mock;
};

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

describe('CurrencyForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onCancel.mockReset();
    currenciesApi.createCurrency.mockReset();
    currenciesApi.updateCurrency.mockReset();
  });

  it('renders the code and base-currency fields in create mode, but not the status field', () => {
    renderWithProviders(<CurrencyForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText(/currency code/i)).toHaveValue('');
    expect(screen.getByLabelText(/set as base currency/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Currency' })).toBeInTheDocument();
  });

  it('pre-fills name/symbol/status in edit mode, but hides code and base-currency fields', () => {
    renderWithProviders(<CurrencyForm mode="edit" currency={currency} onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText(/currency name/i)).toHaveValue(currency.name);
    expect(screen.getByLabelText(/symbol/i)).toHaveValue(currency.symbol);
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/currency code/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/set as base currency/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when required fields are missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Add Currency' }));

    expect(await screen.findByText(/currency code is required/i)).toBeInTheDocument();
    expect(currenciesApi.createCurrency).not.toHaveBeenCalled();
  });

  it('rejects a currency code that is not exactly 3 letters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/currency code/i), 'US');
    await user.type(screen.getByLabelText(/currency name/i), 'US Dollar');
    await user.type(screen.getByLabelText(/symbol/i), '$');
    await user.click(screen.getByRole('button', { name: 'Add Currency' }));

    expect(await screen.findByText(/use 3 uppercase letters/i)).toBeInTheDocument();
    expect(currenciesApi.createCurrency).not.toHaveBeenCalled();
  });

  it('submits normalized create values and calls onSuccess', async () => {
    const user = userEvent.setup();
    currenciesApi.createCurrency.mockResolvedValue({ ...currency, id: 'currency-2', code: 'USD' });
    renderWithProviders(<CurrencyForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/currency code/i), 'usd');
    await user.type(screen.getByLabelText(/currency name/i), 'US Dollar');
    await user.type(screen.getByLabelText(/symbol/i), '$');
    await user.click(screen.getByRole('button', { name: 'Add Currency' }));

    await waitFor(() => expect(currenciesApi.createCurrency).toHaveBeenCalledTimes(1));
    expect(currenciesApi.createCurrency.mock.calls[0][0]).toEqual(
      expect.objectContaining({ code: 'USD', name: 'US Dollar', symbol: '$', isBaseCurrency: false, isActive: true })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits only name/symbol/isActive on edit and calls onSuccess', async () => {
    const user = userEvent.setup();
    currenciesApi.updateCurrency.mockResolvedValue(currency);
    renderWithProviders(<CurrencyForm mode="edit" currency={currency} onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(currenciesApi.updateCurrency).toHaveBeenCalledTimes(1));
    expect(currenciesApi.updateCurrency).toHaveBeenCalledWith(
      currency.id,
      { name: currency.name, symbol: currency.symbol, isActive: true }
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('surfaces a server error without calling onSuccess', async () => {
    const user = userEvent.setup();
    currenciesApi.createCurrency.mockRejectedValue(new Error('Currency code already exists.'));
    renderWithProviders(<CurrencyForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/currency code/i), 'USD');
    await user.type(screen.getByLabelText(/currency name/i), 'US Dollar');
    await user.type(screen.getByLabelText(/symbol/i), '$');
    await user.click(screen.getByRole('button', { name: 'Add Currency' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
