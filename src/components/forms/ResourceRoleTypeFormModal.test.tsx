import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ResourceRoleTypeFormModal } from './ResourceRoleTypeFormModal';
import type { ResourceRoleType } from '@/types/domain.types';

jest.mock('../../lib/api/resourceRoleTypes.api', () => ({
  createResourceRoleType: jest.fn(),
  updateResourceRoleType: jest.fn(),
}));

const roleType: ResourceRoleType = {
  id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
  name: 'Software Engineer',
  description: 'Full-stack software engineer role',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ResourceRoleTypeFormModal', () => {
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onClose.mockReset();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(
      <ResourceRoleTypeFormModal open={false} mode="create" onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the "Add role type" title in create mode', () => {
    renderWithProviders(
      <ResourceRoleTypeFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add role type' })).toBeInTheDocument();
  });

  it('shows the "Edit role type" title in edit mode', () => {
    renderWithProviders(
      <ResourceRoleTypeFormModal open mode="edit" roleType={roleType} onSuccess={onSuccess} onClose={onClose} />
    );
    expect(screen.getByRole('heading', { name: 'Edit role type' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ResourceRoleTypeFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ResourceRoleTypeFormModal open mode="create" onSuccess={onSuccess} onClose={onClose} />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
