import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CountryForm } from './CountryForm';
import type { Country } from '@/types/domain.types';

jest.mock('../../lib/api/countries.api', () => ({
  createCountry: jest.fn(),
  updateCountry: jest.fn(),
}));

const countriesApi = jest.requireMock('../../lib/api/countries.api') as {
  createCountry: jest.Mock;
  updateCountry: jest.Mock;
};

const country: Country = {
  id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
  code: 'MM',
  name: 'Myanmar',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CountryForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onCancel.mockReset();
    countriesApi.createCountry.mockReset();
    countriesApi.updateCountry.mockReset();
  });

  it('renders the code field in create mode', () => {
    renderWithProviders(<CountryForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText(/country code/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add Country' })).toBeInTheDocument();
  });

  it('pre-fills the name in edit mode, but hides the code field', () => {
    renderWithProviders(<CountryForm mode="edit" country={country} onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText(/country name/i)).toHaveValue(country.name);
    expect(screen.queryByLabelText(/country code/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when required fields are missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CountryForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Add Country' }));

    expect(await screen.findByText(/country code is required/i)).toBeInTheDocument();
    expect(countriesApi.createCountry).not.toHaveBeenCalled();
  });

  it('rejects a country code that is not exactly 2 letters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CountryForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    // The `code` input has `maxLength={2}` (matching the 2-letter ISO
    // 3166-1 alpha-2 format), so a single letter is used here to exercise
    // the "too short" regex rejection without the browser truncating a
    // longer string down to a value that would otherwise pass validation.
    await user.type(screen.getByLabelText(/country code/i), 'S');
    await user.type(screen.getByLabelText(/country name/i), 'Singapore');
    await user.click(screen.getByRole('button', { name: 'Add Country' }));

    expect(await screen.findByText(/use 2 uppercase letters/i)).toBeInTheDocument();
    expect(countriesApi.createCountry).not.toHaveBeenCalled();
  });

  it('submits normalized create values and calls onSuccess', async () => {
    const user = userEvent.setup();
    countriesApi.createCountry.mockResolvedValue({ ...country, id: 'country-2', code: 'SG', name: 'Singapore' });
    renderWithProviders(<CountryForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/country code/i), 'sg');
    await user.type(screen.getByLabelText(/country name/i), 'Singapore');
    await user.click(screen.getByRole('button', { name: 'Add Country' }));

    await waitFor(() => expect(countriesApi.createCountry).toHaveBeenCalledTimes(1));
    expect(countriesApi.createCountry.mock.calls[0][0]).toEqual(
      expect.objectContaining({ code: 'SG', name: 'Singapore' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits only the name on edit and calls onSuccess', async () => {
    const user = userEvent.setup();
    countriesApi.updateCountry.mockResolvedValue(country);
    renderWithProviders(<CountryForm mode="edit" country={country} onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(countriesApi.updateCountry).toHaveBeenCalledTimes(1));
    expect(countriesApi.updateCountry).toHaveBeenCalledWith(country.id, { name: country.name });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('surfaces a server error without calling onSuccess', async () => {
    const user = userEvent.setup();
    countriesApi.createCountry.mockRejectedValue(new Error('Country code already exists.'));
    renderWithProviders(<CountryForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/country code/i), 'MM');
    await user.type(screen.getByLabelText(/country name/i), 'Myanmar');
    await user.click(screen.getByRole('button', { name: 'Add Country' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CountryForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
