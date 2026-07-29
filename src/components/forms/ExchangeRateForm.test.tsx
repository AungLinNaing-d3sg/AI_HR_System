import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ExchangeRateForm } from './ExchangeRateForm';
import type { Currency } from '@/types/domain.types';
import type { ExchangeRate } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

jest.mock('../../lib/api/exchangeRates.api', () => ({
  createExchangeRate: jest.fn(),
  updateExchangeRate: jest.fn(),
}));

const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as { getCurrencies: jest.Mock };
const exchangeRatesApi = jest.requireMock('../../lib/api/exchangeRates.api') as {
  createExchangeRate: jest.Mock;
  updateExchangeRate: jest.Mock;
};

const currencies: Currency[] = [
  { id: 'currency-1', code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBaseCurrency: true, isActive: true },
  { id: 'currency-2', code: 'USD', name: 'US Dollar', symbol: '$', isBaseCurrency: false, isActive: true },
  { id: 'currency-3', code: 'INR', name: 'Indian Rupee', symbol: '₹', isBaseCurrency: false, isActive: true },
];

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

describe('ExchangeRateForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onCancel.mockReset();
    currenciesApi.getCurrencies.mockReset();
    exchangeRatesApi.createExchangeRate.mockReset();
    exchangeRatesApi.updateExchangeRate.mockReset();
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
  });

  it('shows the base currency and a target currency dropdown (excluding the base) in create mode', async () => {
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    expect(await screen.findByText(/SGD — Singapore Dollar \(Base currency\)/i)).toBeInTheDocument();
    const select = screen.getByLabelText(/to currency/i) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((option) => option.value);
    expect(optionValues).not.toContain('currency-1');
    expect(optionValues).toContain('currency-2');
    expect(screen.getByRole('button', { name: 'Add Rate' })).toBeInTheDocument();
  });

  it('shows the fixed currency pair and status field in edit mode, without a target currency dropdown', async () => {
    renderWithProviders(
      <ExchangeRateForm mode="edit" exchangeRate={exchangeRate} onSuccess={onSuccess} onCancel={onCancel} />
    );

    expect(await screen.findByText('SGD')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByLabelText(/^rate$/i)).toHaveValue(0.74);
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/to currency/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when required fields are missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await screen.findByText(/SGD — Singapore Dollar/i);
    await user.click(screen.getByRole('button', { name: 'Add Rate' }));

    expect(await screen.findByText(/target currency is required/i)).toBeInTheDocument();
    expect(exchangeRatesApi.createExchangeRate).not.toHaveBeenCalled();
  });

  it('rejects a zero rate', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await screen.findByText(/SGD — Singapore Dollar/i);
    await user.selectOptions(screen.getByLabelText(/to currency/i), 'currency-2');
    await user.type(screen.getByLabelText(/^rate$/i), '0');
    await user.type(screen.getByLabelText(/effective date/i), '2025-01-01');
    await user.click(screen.getByRole('button', { name: 'Add Rate' }));

    expect(await screen.findByText(/rate must be greater than 0/i)).toBeInTheDocument();
    expect(exchangeRatesApi.createExchangeRate).not.toHaveBeenCalled();
  });

  it('submits create values (without fromCurrencyId) and calls onSuccess', async () => {
    const user = userEvent.setup();
    exchangeRatesApi.createExchangeRate.mockResolvedValue({
      id: 'rate-2',
      fromCurrencyId: 'currency-1',
      toCurrencyId: 'currency-2',
      rate: 0.74,
      effectiveDate: '2025-01-01',
      isActive: true,
    });
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await screen.findByText(/SGD — Singapore Dollar/i);
    await user.selectOptions(screen.getByLabelText(/to currency/i), 'currency-2');
    await user.type(screen.getByLabelText(/^rate$/i), '0.74');
    await user.type(screen.getByLabelText(/effective date/i), '2025-01-01');
    await user.click(screen.getByRole('button', { name: 'Add Rate' }));

    await waitFor(() => expect(exchangeRatesApi.createExchangeRate).toHaveBeenCalledTimes(1));
    expect(exchangeRatesApi.createExchangeRate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits only rate/effectiveDate/isActive on edit and calls onSuccess', async () => {
    const user = userEvent.setup();
    exchangeRatesApi.updateExchangeRate.mockResolvedValue({
      id: 'rate-1',
      fromCurrencyId: 'currency-1',
      toCurrencyId: 'currency-2',
      rate: 0.8,
      effectiveDate: '2025-02-01',
      isActive: true,
    });
    renderWithProviders(
      <ExchangeRateForm mode="edit" exchangeRate={exchangeRate} onSuccess={onSuccess} onCancel={onCancel} />
    );

    await screen.findByText('USD');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(exchangeRatesApi.updateExchangeRate).toHaveBeenCalledTimes(1));
    expect(exchangeRatesApi.updateExchangeRate).toHaveBeenCalledWith(
      exchangeRate.id,
      { rate: exchangeRate.rate, effectiveDate: exchangeRate.effectiveDate, isActive: true }
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('surfaces a server error without calling onSuccess', async () => {
    const user = userEvent.setup();
    exchangeRatesApi.createExchangeRate.mockRejectedValue(new Error('Target currency must be different.'));
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await screen.findByText(/SGD — Singapore Dollar/i);
    await user.selectOptions(screen.getByLabelText(/to currency/i), 'currency-2');
    await user.type(screen.getByLabelText(/^rate$/i), '0.74');
    await user.type(screen.getByLabelText(/effective date/i), '2025-01-01');
    await user.click(screen.getByRole('button', { name: 'Add Rate' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await screen.findByText(/SGD — Singapore Dollar/i);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables the submit button in create mode when no base currency is configured', async () => {
    currenciesApi.getCurrencies.mockReset();
    const noBaseCurrencies = currencies.map((currency) => ({ ...currency, isBaseCurrency: false }));
    currenciesApi.getCurrencies.mockResolvedValue({ currencies: noBaseCurrencies, totalCount: noBaseCurrencies.length });
    renderWithProviders(<ExchangeRateForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    expect(await screen.findByText(/no base currency configured/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Rate' })).toBeDisabled();
  });
});
