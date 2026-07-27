import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CountryFormModal } from './CountryFormModal';
import type { Country } from '@/types/domain.types';

jest.mock('../../lib/api/countries.api', () => ({
  createCountry: jest.fn(),
  updateCountry: jest.fn(),
}));

const country: Country = {
  id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
  code: 'MM',
  name: 'Myanmar',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CountryFormModal', () => {
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onClose.mockReset();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(<CountryFormModal open={false} mode="create" onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the "Add country" title in create mode', () => {
    renderWithProviders(<CountryFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add country' })).toBeInTheDocument();
  });

  it('shows the "Edit country" title in edit mode', () => {
    renderWithProviders(
      <CountryFormModal open mode="edit" country={country} onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.getByRole('heading', { name: 'Edit country' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CountryFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CountryFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
