import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ExchangeRatesTable } from './ExchangeRatesTable';
import type { Currency, ExchangeRate } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

jest.mock('../../lib/api/exchangeRates.api', () => ({
  getExchangeRates: jest.fn(),
  createExchangeRate: jest.fn(),
  updateExchangeRate: jest.fn(),
  deleteExchangeRate: jest.fn(),
}));

const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as { getCurrencies: jest.Mock };
const exchangeRatesApi = jest.requireMock('../../lib/api/exchangeRates.api') as {
  getExchangeRates: jest.Mock;
  createExchangeRate: jest.Mock;
  updateExchangeRate: jest.Mock;
  deleteExchangeRate: jest.Mock;
};

const currencies: Currency[] = [
  { id: 'currency-1', code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBaseCurrency: true, isActive: true },
  { id: 'currency-2', code: 'USD', name: 'US Dollar', symbol: '$', isBaseCurrency: false, isActive: true },
  { id: 'currency-3', code: 'INR', name: 'Indian Rupee', symbol: '₹', isBaseCurrency: false, isActive: true },
];

const exchangeRates: ExchangeRate[] = [
  {
    id: 'rate-1',
    fromCurrency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
    toCurrency: { id: 'currency-2', code: 'USD', symbol: '$' },
    rate: 0.74,
    effectiveDate: '2025-01-01',
    isActive: true,
  },
  {
    id: 'rate-2',
    fromCurrency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
    toCurrency: { id: 'currency-3', code: 'INR', symbol: '₹' },
    rate: 62.5,
    effectiveDate: '2025-01-01',
    isActive: true,
  },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ExchangeRatesTable', () => {
  beforeEach(() => {
    currenciesApi.getCurrencies.mockReset();
    exchangeRatesApi.getExchangeRates.mockReset();
    exchangeRatesApi.createExchangeRate.mockReset();
    exchangeRatesApi.updateExchangeRate.mockReset();
    exchangeRatesApi.deleteExchangeRate.mockReset();
  });

  it('renders the page header and shows a loading state initially', () => {
    currenciesApi.getCurrencies.mockReturnValue(new Promise(() => {}));
    exchangeRatesApi.getExchangeRates.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ExchangeRatesTable />);

    expect(screen.getByRole('heading', { name: 'Exchange Rates' })).toBeInTheDocument();
    expect(screen.getByText(/loading exchange rates/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the exchange rate list fails to load', async () => {
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockRejectedValue(new Error('network down'));
    renderWithProviders(<ExchangeRatesTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows a message pointing to Currencies when no currencies are configured', async () => {
    currenciesApi.getCurrencies.mockResolvedValue([]);
    exchangeRatesApi.getExchangeRates.mockResolvedValue([]);
    renderWithProviders(<ExchangeRatesTable />);

    expect(await screen.findByText(/no currencies configured yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Currencies' })).toHaveAttribute('href', '/admin/currencies');
  });

  it('shows an empty state when there are no exchange rates yet', async () => {
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue([]);
    renderWithProviders(<ExchangeRatesTable />);

    expect(await screen.findByText(/no exchange rates yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no active rate/i)).toHaveLength(2);
  });

  it('renders a summary card per currency, highlighting the base currency and showing conversion rates for the rest', async () => {
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    renderWithProviders(<ExchangeRatesTable />);

    expect(await screen.findByText('Base currency')).toBeInTheDocument();
    // The same "1 SGD = <rate> <code>" text appears once in the summary
    // card and once more in the table's Rate column subtitle.
    expect(screen.getAllByText('1 SGD = 0.74 USD')).toHaveLength(2);
    expect(screen.getAllByText('1 SGD = 62.5 INR')).toHaveLength(2);
  });

  it('renders a table row per exchange rate with formatted dates and status', async () => {
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findByText('Base currency');
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('SGD')).toHaveLength(2);
    expect(within(table).getByText('USD')).toBeInTheDocument();
    expect(within(table).getByText('INR')).toBeInTheDocument();
    expect(within(table).getAllByText(/Jan 1, 2025/)).toHaveLength(2);
    expect(within(table).getAllByText('Active')).toHaveLength(2);
  });

  it('opens the Add Rate modal when the header button is clicked', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findByText('Base currency');
    await user.click(screen.getByRole('button', { name: /add rate/i }));

    expect(screen.getByRole('heading', { name: 'Add exchange rate' })).toBeInTheDocument();
  });

  it('disables the Add Rate button when no base currency is configured', async () => {
    currenciesApi.getCurrencies.mockResolvedValue(currencies.map((currency) => ({ ...currency, isBaseCurrency: false })));
    exchangeRatesApi.getExchangeRates.mockResolvedValue([]);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findAllByText(/no active rate/i);
    expect(screen.getByRole('button', { name: /add rate/i })).toBeDisabled();
  });

  it('opens the Edit modal pre-filled for the clicked row', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findByText('Base currency');
    // Rows are sorted by target currency code (INR before USD), so index 1 is the SGD -> USD row.
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[1]);

    expect(screen.getByRole('heading', { name: 'Edit exchange rate' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^rate$/i)).toHaveValue(0.74);
  });

  it('opens a confirm dialog before deleting and calls deleteExchangeRate on confirm', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    exchangeRatesApi.deleteExchangeRate.mockResolvedValue(undefined);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findByText('Base currency');
    // Rows are sorted by target currency code (INR before USD), so index 1 is the SGD -> USD row (rate-1).
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(exchangeRatesApi.deleteExchangeRate).toHaveBeenCalledWith('rate-1'));
  });

  it('closes the confirm dialog without deleting when cancelled', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findByText('Base currency');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(exchangeRatesApi.deleteExchangeRate).not.toHaveBeenCalled();
  });

  it('shows the informational note about how exchange rates are applied', async () => {
    currenciesApi.getCurrencies.mockResolvedValue(currencies);
    exchangeRatesApi.getExchangeRates.mockResolvedValue(exchangeRates);
    renderWithProviders(<ExchangeRatesTable />);

    await screen.findByText('Base currency');
    expect(screen.getByText(/applied when generating invoices in non-base currencies/i)).toBeInTheDocument();
  });
});
