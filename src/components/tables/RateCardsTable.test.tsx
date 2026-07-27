import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { RateCardsTable } from './RateCardsTable';
import type { RateCard } from '@/types/domain.types';

jest.mock('../../lib/api/rateCards.api', () => ({
  getRateCards: jest.fn(),
  createRateCard: jest.fn(),
  updateRateCard: jest.fn(),
  deleteRateCard: jest.fn(),
}));

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

jest.mock('../../lib/api/resourceRoleTypes.api', () => ({
  getResourceRoleTypes: jest.fn(),
}));

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

const rateCardsApi = jest.requireMock('../../lib/api/rateCards.api') as {
  getRateCards: jest.Mock;
  createRateCard: jest.Mock;
  updateRateCard: jest.Mock;
  deleteRateCard: jest.Mock;
};
const countriesApi = jest.requireMock('../../lib/api/countries.api') as { getCountries: jest.Mock };
const resourceRoleTypesApi = jest.requireMock('../../lib/api/resourceRoleTypes.api') as {
  getResourceRoleTypes: jest.Mock;
};
const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as { getCurrencies: jest.Mock };

const rateCards: RateCard[] = [
  {
    id: 'rate-card-1',
    country: { id: 'country-sg', code: 'SG', name: 'Singapore' },
    resourceRoleType: { id: 'role-junior', name: 'Junior Developer' },
    currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
    hourlyRate: 20,
    billingRate: 400,
    effectiveDate: '2025-01-01',
    isActive: true,
  },
  {
    id: 'rate-card-2',
    country: { id: 'country-sg', code: 'SG', name: 'Singapore' },
    resourceRoleType: { id: 'role-senior', name: 'Senior Developer' },
    currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
    hourlyRate: 25,
    billingRate: 700,
    effectiveDate: '2025-01-01',
    isActive: true,
  },
  {
    id: 'rate-card-3',
    country: { id: 'country-in', code: 'IN', name: 'India' },
    resourceRoleType: { id: 'role-junior', name: 'Junior Developer' },
    currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
    hourlyRate: 10,
    billingRate: 200,
    effectiveDate: '2025-01-01',
    isActive: true,
  },
  {
    id: 'rate-card-4',
    country: { id: 'country-in', code: 'IN', name: 'India' },
    resourceRoleType: { id: 'role-senior', name: 'Senior Developer' },
    currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
    hourlyRate: 15,
    billingRate: 400,
    effectiveDate: '2025-01-01',
    isActive: false,
  },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/**
 * Mimics the real `/api/rate-cards?countryId=` server-side filter (see
 * `RateCardsTable`'s own dual unpaged/paged `useRateCards` calls): returns
 * every rate card when no `countryId` is passed (the unpaged summary-card
 * call, or the paged call with "All Countries" selected), and only the
 * matching ones otherwise (the paged call with a country filter selected).
 */
function mockGetRateCards(all: RateCard[]) {
  rateCardsApi.getRateCards.mockImplementation(async (params: { countryId?: string } = {}) => {
    const filtered = params.countryId ? all.filter((rateCard) => rateCard.country.id === params.countryId) : all;
    return { rateCards: filtered, totalCount: filtered.length };
  });
}

describe('RateCardsTable', () => {
  beforeEach(() => {
    rateCardsApi.getRateCards.mockReset();
    rateCardsApi.createRateCard.mockReset();
    rateCardsApi.updateRateCard.mockReset();
    rateCardsApi.deleteRateCard.mockReset();
    countriesApi.getCountries.mockReset();
    resourceRoleTypesApi.getResourceRoleTypes.mockReset();
    currenciesApi.getCurrencies.mockReset();
  });

  it('renders the page header and shows a loading state initially', () => {
    rateCardsApi.getRateCards.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<RateCardsTable />);

    expect(screen.getByRole('heading', { name: 'Rate Cards' })).toBeInTheDocument();
    expect(screen.getByText(/loading rate cards/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the rate card list fails to load', async () => {
    rateCardsApi.getRateCards.mockRejectedValue(new Error('network down'));
    renderWithProviders(<RateCardsTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no rate cards yet', async () => {
    mockGetRateCards([]);
    renderWithProviders(<RateCardsTable />);

    expect(await screen.findByText(/no rate cards yet/i)).toBeInTheDocument();
  });

  it('renders a summary card per country with role count and daily rate range', async () => {
    mockGetRateCards(rateCards);
    renderWithProviders(<RateCardsTable />);

    expect(await screen.findByText('2 roles · SGD 400-700/day')).toBeInTheDocument();
    expect(screen.getByText('2 roles · SGD 200-400/day')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Singapore/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /India/ })).toBeInTheDocument();
  });

  it('renders a table row per rate card', async () => {
    mockGetRateCards(rateCards);
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Singapore')).toHaveLength(2);
    expect(within(table).getAllByText('India')).toHaveLength(2);
    expect(within(table).getAllByText('Junior Developer')).toHaveLength(2);
    expect(within(table).getAllByText('Senior Developer')).toHaveLength(2);
    expect(within(table).getAllByText('Active')).toHaveLength(3);
    expect(within(table).getAllByText('Inactive')).toHaveLength(1);
    expect(screen.getByText('4 rate cards match this filter')).toBeInTheDocument();
  });

  it('filters the table to a single country when its summary card is clicked, and clears on a second click', async () => {
    const user = userEvent.setup();
    mockGetRateCards(rateCards);
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    await user.click(screen.getByRole('button', { name: /Singapore/ }));

    expect(screen.getByText('2 rate cards match this filter')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Singapore')).toHaveLength(2);
    expect(within(table).queryByText('India')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Singapore/ }));
    expect(screen.getByText('4 rate cards match this filter')).toBeInTheDocument();
  });

  it('filters the table via the country dropdown, synchronized with the cards', async () => {
    const user = userEvent.setup();
    mockGetRateCards(rateCards);
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    await user.selectOptions(screen.getByLabelText('Filter by country:'), 'India');

    expect(screen.getByText('2 rate cards match this filter')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).queryByText('Singapore')).not.toBeInTheDocument();
    expect(within(table).getAllByText('India')).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText('Filter by country:'), 'All Countries');
    expect(screen.getByText('4 rate cards match this filter')).toBeInTheDocument();
  });

  it('opens the Add Rate Card modal when the header button is clicked', async () => {
    const user = userEvent.setup();
    mockGetRateCards(rateCards);
    countriesApi.getCountries.mockResolvedValue({ countries: [], totalCount: 0 });
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue({ roleTypes: [], totalCount: 0 });
    currenciesApi.getCurrencies.mockResolvedValue({ currencies: [], totalCount: 0 });
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    await user.click(screen.getByRole('button', { name: /add rate card/i }));

    expect(screen.getByRole('heading', { name: 'Add rate card' })).toBeInTheDocument();
  });

  it('opens the Edit modal pre-filled for the clicked row', async () => {
    const user = userEvent.setup();
    mockGetRateCards(rateCards);
    // RateCardForm's country/role/currency reference-data hooks are called even in edit mode (see its comment).
    countriesApi.getCountries.mockResolvedValue({ countries: [], totalCount: 0 });
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue({ roleTypes: [], totalCount: 0 });
    currenciesApi.getCurrencies.mockResolvedValue({ currencies: [], totalCount: 0 });
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    expect(screen.getByRole('heading', { name: 'Edit rate card' })).toBeInTheDocument();
  });

  it('opens a confirm dialog before deleting and calls deleteRateCard on confirm', async () => {
    const user = userEvent.setup();
    mockGetRateCards(rateCards);
    rateCardsApi.deleteRateCard.mockResolvedValue(undefined);
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    // Rows are sorted by country name then role name (India before Singapore), so index 0 is India - Junior Developer (rate-card-3).
    await waitFor(() => expect(rateCardsApi.deleteRateCard).toHaveBeenCalledWith('rate-card-3'));
  });

  it('closes the confirm dialog without deleting when cancelled', async () => {
    const user = userEvent.setup();
    mockGetRateCards(rateCards);
    renderWithProviders(<RateCardsTable />);

    await screen.findByText('2 roles · SGD 400-700/day');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(rateCardsApi.deleteRateCard).not.toHaveBeenCalled();
  });
});
