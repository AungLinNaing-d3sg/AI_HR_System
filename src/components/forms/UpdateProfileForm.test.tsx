import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { UpdateProfileForm } from './UpdateProfileForm';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthenticatedUser, Country } from '@/types/domain.types';

jest.mock('../../lib/api/auth.api', () => ({
  updateProfile: jest.fn(),
}));

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as { updateProfile: jest.Mock };
const countriesApi = jest.requireMock('../../lib/api/countries.api') as { getCountries: jest.Mock };

const countries: Country[] = [
  { id: '22222222-2222-2222-2222-222222222201', code: 'SG', name: 'Singapore' },
  { id: '22222222-2222-2222-2222-222222222202', code: 'US', name: 'United States' },
];

const user: AuthenticatedUser = {
  id: 'user-1',
  username: 'jdoe',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: null,
  countryId: '22222222-2222-2222-2222-222222222201',
  role: 'Employee',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UpdateProfileForm', () => {
  beforeEach(() => {
    authApi.updateProfile.mockReset();
    countriesApi.getCountries.mockReset();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    useAuthStore.setState({ user: null, hasHydrated: true });
  });

  it('pre-fills every editable field, including the current country, from the given user', async () => {
    renderWithProviders(<UpdateProfileForm user={user} />);

    expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    await waitFor(() => expect(screen.getByLabelText('Country')).toHaveValue('Singapore (SG)'));
  });

  it('shows every country once the searchable Country combobox is opened, same as the other Country fields', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<UpdateProfileForm user={user} />);

    await waitFor(() => expect(screen.getByLabelText('Country')).toHaveValue('Singapore (SG)'));
    await testUser.click(screen.getByLabelText('Country'));

    expect(await screen.findByRole('option', { name: /united states/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /singapore/i })).toBeInTheDocument();
  });

  it('submits the newly selected countryId when the Country combobox selection is changed', async () => {
    const testUser = userEvent.setup();
    authApi.updateProfile.mockResolvedValue({ ...user, countryId: countries[1].id });
    renderWithProviders(<UpdateProfileForm user={user} />);

    await waitFor(() => expect(screen.getByLabelText('Country')).toHaveValue('Singapore (SG)'));
    await testUser.click(screen.getByLabelText('Country'));
    await testUser.click(await screen.findByRole('option', { name: /united states/i }));
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(authApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ countryId: '22222222-2222-2222-2222-222222222202' })
      )
    );
  });

  it('shows a validation error and does not submit when the Country is cleared (Country is required)', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<UpdateProfileForm user={user} />);

    await waitFor(() => expect(screen.getByLabelText('Country')).toHaveValue('Singapore (SG)'));
    await testUser.clear(screen.getByLabelText('Country'));
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Please select a country.')).toBeInTheDocument();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
  });

  it('shows a validation error and does not submit when a required field is cleared', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<UpdateProfileForm user={user} />);

    await testUser.clear(screen.getByLabelText('Email'));
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
  });

  it('shows a success message and syncs the auth store after a successful save', async () => {
    const testUser = userEvent.setup();
    const updatedUser: AuthenticatedUser = { ...user, firstName: 'Janet' };
    authApi.updateProfile.mockResolvedValue(updatedUser);
    renderWithProviders(<UpdateProfileForm user={user} />);

    await testUser.clear(screen.getByLabelText('First name'));
    await testUser.type(screen.getByLabelText('First name'), 'Janet');
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Your profile has been updated.')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().user).toEqual(updatedUser));
  });

  it('surfaces a server error without showing the success message', async () => {
    const testUser = userEvent.setup();
    authApi.updateProfile.mockRejectedValue(new Error('Email is already taken.'));
    renderWithProviders(<UpdateProfileForm user={user} />);

    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Your profile has been updated.')).not.toBeInTheDocument();
  });
});
