import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CountriesTable } from './CountriesTable';
import type { Country, RateCard } from '@/types/domain.types';

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
  createCountry: jest.fn(),
  updateCountry: jest.fn(),
  deleteCountry: jest.fn(),
}));

jest.mock('../../lib/api/rateCards.api', () => ({
  getRateCards: jest.fn(),
}));

const countriesApi = jest.requireMock('../../lib/api/countries.api') as {
  getCountries: jest.Mock;
  createCountry: jest.Mock;
  updateCountry: jest.Mock;
  deleteCountry: jest.Mock;
};
const rateCardsApi = jest.requireMock('../../lib/api/rateCards.api') as { getRateCards: jest.Mock };

const countries: Country[] = [
  { id: 'country-sg', code: 'SG', name: 'Singapore' },
  { id: 'country-us', code: 'US', name: 'United States' },
];

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
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CountriesTable', () => {
  beforeEach(() => {
    countriesApi.getCountries.mockReset();
    countriesApi.createCountry.mockReset();
    countriesApi.updateCountry.mockReset();
    countriesApi.deleteCountry.mockReset();
    rateCardsApi.getRateCards.mockReset();
    rateCardsApi.getRateCards.mockResolvedValue({ rateCards, totalCount: rateCards.length });
  });

  it('renders the page header and shows a loading state initially', () => {
    countriesApi.getCountries.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CountriesTable />);

    expect(screen.getByRole('heading', { name: 'Countries' })).toBeInTheDocument();
    expect(screen.getByText(/loading countries/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no countries', async () => {
    countriesApi.getCountries.mockResolvedValue({ countries: [], totalCount: 0 });
    renderWithProviders(<CountriesTable />);

    expect(await screen.findByText(/no countries yet/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    countriesApi.getCountries.mockRejectedValue(new Error('network down'));
    renderWithProviders(<CountriesTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a row per country with its code and rate card count', async () => {
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    renderWithProviders(<CountriesTable />);

    expect(await screen.findByText('Singapore')).toBeInTheDocument();
    expect(screen.getByText('SG')).toBeInTheDocument();
    expect(screen.getByText('2 rate cards')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('No rate cards')).toBeInTheDocument();
  });

  it('shows an Active status badge for every country', async () => {
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    renderWithProviders(<CountriesTable />);

    await screen.findByText('Singapore');
    expect(screen.getAllByText('Active')).toHaveLength(2);
  });

  it('disables the Delete action for a country that has rate cards', async () => {
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    renderWithProviders(<CountriesTable />);

    await screen.findByText('Singapore');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).toBeEnabled();
  });

  it('opens the Add Country modal when the header button is clicked', async () => {
    const user = userEvent.setup();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    renderWithProviders(<CountriesTable />);

    await screen.findByText('Singapore');
    await user.click(screen.getByRole('button', { name: /add country/i }));

    expect(screen.getByRole('heading', { name: 'Add country' })).toBeInTheDocument();
  });

  it('opens the Edit modal pre-filled for the clicked row', async () => {
    const user = userEvent.setup();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    renderWithProviders(<CountriesTable />);

    await screen.findByText('Singapore');
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[1]);

    expect(screen.getByRole('heading', { name: 'Edit country' })).toBeInTheDocument();
    expect(screen.getByLabelText(/country name/i)).toHaveValue('United States');
  });

  it('opens a confirm dialog before deleting and calls deleteCountry on confirm', async () => {
    const user = userEvent.setup();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    countriesApi.deleteCountry.mockResolvedValue(undefined);
    renderWithProviders(<CountriesTable />);

    await screen.findByText('Singapore');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(countriesApi.deleteCountry).toHaveBeenCalledWith('country-us'));
  });

  it('closes the confirm dialog without deleting when cancelled', async () => {
    const user = userEvent.setup();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    renderWithProviders(<CountriesTable />);

    await screen.findByText('Singapore');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(countriesApi.deleteCountry).not.toHaveBeenCalled();
  });
});
