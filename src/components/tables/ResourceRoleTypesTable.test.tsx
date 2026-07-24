import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ResourceRoleTypesTable } from './ResourceRoleTypesTable';
import type { ResourceRoleType } from '@/types/domain.types';

jest.mock('../../lib/api/resourceRoleTypes.api', () => ({
  getResourceRoleTypes: jest.fn(),
  createResourceRoleType: jest.fn(),
  updateResourceRoleType: jest.fn(),
  deleteResourceRoleType: jest.fn(),
}));

const resourceRoleTypesApi = jest.requireMock('../../lib/api/resourceRoleTypes.api') as {
  getResourceRoleTypes: jest.Mock;
  createResourceRoleType: jest.Mock;
  updateResourceRoleType: jest.Mock;
  deleteResourceRoleType: jest.Mock;
};

const roleTypes: ResourceRoleType[] = [
  { id: 'role-senior', name: 'Senior Developer', description: 'Senior software engineer with 5+ years experience' },
  { id: 'role-junior', name: 'Junior Developer', description: null },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ResourceRoleTypesTable', () => {
  beforeEach(() => {
    resourceRoleTypesApi.getResourceRoleTypes.mockReset();
    resourceRoleTypesApi.createResourceRoleType.mockReset();
    resourceRoleTypesApi.updateResourceRoleType.mockReset();
    resourceRoleTypesApi.deleteResourceRoleType.mockReset();
  });

  it('renders the page header and shows a loading state initially', () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ResourceRoleTypesTable />);

    expect(screen.getByRole('heading', { name: 'Resource Role Types' })).toBeInTheDocument();
    expect(screen.getByText(/loading resource role types/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no role types', async () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue([]);
    renderWithProviders(<ResourceRoleTypesTable />);

    expect(await screen.findByText(/no resource role types yet/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockRejectedValue(new Error('network down'));
    renderWithProviders(<ResourceRoleTypesTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a row per role type sorted alphabetically, with a placeholder for a missing description', async () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
    renderWithProviders(<ResourceRoleTypesTable />);

    expect(await screen.findByText('Junior Developer')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('Senior software engineer with 5+ years experience')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    // rows[0] is the header row; alphabetical sort puts Junior before Senior.
    expect(within(rows[1]).getByText('Junior Developer')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Senior Developer')).toBeInTheDocument();
  });

  it('opens the Add Role Type modal when the header button is clicked', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
    renderWithProviders(<ResourceRoleTypesTable />);

    await screen.findByText('Senior Developer');
    await user.click(screen.getByRole('button', { name: /add role type/i }));

    expect(screen.getByRole('heading', { name: 'Add role type' })).toBeInTheDocument();
  });

  it('opens the Edit modal pre-filled for the clicked row', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
    renderWithProviders(<ResourceRoleTypesTable />);

    await screen.findByText('Senior Developer');
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[1]);

    expect(screen.getByRole('heading', { name: 'Edit role type' })).toBeInTheDocument();
    expect(screen.getByLabelText(/role name/i)).toHaveValue('Senior Developer');
  });

  it('opens a confirm dialog before deleting and calls deleteResourceRoleType on confirm', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
    resourceRoleTypesApi.deleteResourceRoleType.mockResolvedValue(undefined);
    renderWithProviders(<ResourceRoleTypesTable />);

    await screen.findByText('Senior Developer');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(resourceRoleTypesApi.deleteResourceRoleType).toHaveBeenCalledWith('role-senior'));
  });

  it('closes the confirm dialog without deleting when cancelled', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
    renderWithProviders(<ResourceRoleTypesTable />);

    await screen.findByText('Senior Developer');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(resourceRoleTypesApi.deleteResourceRoleType).not.toHaveBeenCalled();
  });

  it('surfaces a delete error returned by the backend', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
    resourceRoleTypesApi.deleteResourceRoleType.mockRejectedValue(
      new Error('This role type is assigned to a project and cannot be deleted.')
    );
    renderWithProviders(<ResourceRoleTypesTable />);

    await screen.findByText('Senior Developer');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]);

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/could not delete the resource role type/i)).toBeInTheDocument();
  });
});
