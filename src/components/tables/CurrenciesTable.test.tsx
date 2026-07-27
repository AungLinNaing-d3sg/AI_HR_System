import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CurrenciesTable } from './CurrenciesTable';
import type { Currency } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
  createCurrency: jest.fn(),
  updateCurrency: jest.fn(),
  deleteCurrency: jest.fn(),
}));

const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as {
  getCurrencies: jest.Mock;
  createCurrency: jest.Mock;
  updateCurrency: jest.Mock;
  deleteCurrency: jest.Mock;
};

const currencies: Currency[] = [
  { id: 'currency-1', code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBaseCurrency: true, isActive: true },
  { id: 'currency-2', code: 'USD', name: 'US Dollar', symbol: '$', isBaseCurrency: false, isActive: true },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CurrenciesTable', () => {
  beforeEach(() => {
    currenciesApi.getCurrencies.mockReset();
    currenciesApi.createCurrency.mockReset();
    currenciesApi.updateCurrency.mockReset();
    currenciesApi.deleteCurrency.mockReset();
  });

  it('renders the page header and shows a loading state initially', () => {
    currenciesApi.getCurrencies.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CurrenciesTable />);

    expect(screen.getByRole('heading', { name: 'Currencies' })).toBeInTheDocument();
    expect(screen.getByText(/loading currencies/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no currencies', async () => {
    currenciesApi.getCurrencies.mockResolvedValue({ currencies: [], totalCount: 0 });
    renderWithProviders(<CurrenciesTable />);

    expect(await screen.findByText(/no currencies yet/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    currenciesApi.getCurrencies.mockRejectedValue(new Error('network down'));
    renderWithProviders(<CurrenciesTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a row per currency, highlighting the base currency with a star badge', async () => {
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    renderWithProviders(<CurrenciesTable />);

    expect(await screen.findByText('Singapore Dollar')).toBeInTheDocument();
    expect(screen.getByText('SGD')).toBeInTheDocument();
    expect(screen.getByText('Base Currency')).toBeInTheDocument();
    expect(screen.getByText('US Dollar')).toBeInTheDocument();
  });

  it('shows the informational note about the base currency', async () => {
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    renderWithProviders(<CurrenciesTable />);

    await screen.findByText('Singapore Dollar');
    expect(screen.getByText(/reference for all exchange rate conversions/i)).toBeInTheDocument();
  });

  it('disables the Delete action for the base currency', async () => {
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    renderWithProviders(<CurrenciesTable />);

    await screen.findByText('Singapore Dollar');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).toBeEnabled();
  });

  it('opens the Add Currency modal when the header button is clicked', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    renderWithProviders(<CurrenciesTable />);

    await screen.findByText('Singapore Dollar');
    await user.click(screen.getByRole('button', { name: /add currency/i }));

    expect(screen.getByRole('heading', { name: 'Add currency' })).toBeInTheDocument();
  });

  it('opens the Edit modal pre-filled for the clicked row', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    renderWithProviders(<CurrenciesTable />);

    await screen.findByText('Singapore Dollar');
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[1]);

    expect(screen.getByRole('heading', { name: 'Edit currency' })).toBeInTheDocument();
    expect(screen.getByLabelText(/currency name/i)).toHaveValue('US Dollar');
  });

  it('opens a confirm dialog before deleting and calls deleteCurrency on confirm', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    currenciesApi.deleteCurrency.mockResolvedValue(undefined);
    renderWithProviders(<CurrenciesTable />);

    await screen.findByText('Singapore Dollar');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(currenciesApi.deleteCurrency).toHaveBeenCalledWith('currency-2'));
  });

  it('closes the confirm dialog without deleting when cancelled', async () => {
    const user = userEvent.setup();
    currenciesApi.getCurrencies.mockResolvedValue({ currencies, totalCount: currencies.length });
    renderWithProviders(<CurrenciesTable />);

    await screen.findByText('Singapore Dollar');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(currenciesApi.deleteCurrency).not.toHaveBeenCalled();
  });
});
