import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ResourceRoleTypeForm } from './ResourceRoleTypeForm';
import type { ResourceRoleType } from '@/types/domain.types';

jest.mock('../../lib/api/resourceRoleTypes.api', () => ({
  createResourceRoleType: jest.fn(),
  updateResourceRoleType: jest.fn(),
}));

const resourceRoleTypesApi = jest.requireMock('../../lib/api/resourceRoleTypes.api') as {
  createResourceRoleType: jest.Mock;
  updateResourceRoleType: jest.Mock;
};

const roleType: ResourceRoleType = {
  id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
  name: 'Software Engineer',
  description: 'Full-stack software engineer role',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ResourceRoleTypeForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onCancel.mockReset();
    resourceRoleTypesApi.createResourceRoleType.mockReset();
    resourceRoleTypesApi.updateResourceRoleType.mockReset();
  });

  it('renders empty fields in create mode', () => {
    renderWithProviders(<ResourceRoleTypeForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText(/role name/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add Role Type' })).toBeInTheDocument();
  });

  it('pre-fills the name and description in edit mode', () => {
    renderWithProviders(
      <ResourceRoleTypeForm mode="edit" roleType={roleType} onSuccess={onSuccess} onCancel={onCancel} />
    );

    expect(screen.getByLabelText(/role name/i)).toHaveValue(roleType.name);
    expect(screen.getByLabelText(/description/i)).toHaveValue(roleType.description);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when the name is missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResourceRoleTypeForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Add Role Type' }));

    expect(await screen.findByText(/role name is required/i)).toBeInTheDocument();
    expect(resourceRoleTypesApi.createResourceRoleType).not.toHaveBeenCalled();
  });

  it('submits the create values and calls onSuccess', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.createResourceRoleType.mockResolvedValue(roleType);
    renderWithProviders(<ResourceRoleTypeForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/role name/i), 'Software Engineer');
    await user.type(screen.getByLabelText(/description/i), 'Full-stack software engineer role');
    await user.click(screen.getByRole('button', { name: 'Add Role Type' }));

    await waitFor(() => expect(resourceRoleTypesApi.createResourceRoleType).toHaveBeenCalledTimes(1));
    expect(resourceRoleTypesApi.createResourceRoleType).toHaveBeenCalledWith({
      name: 'Software Engineer',
      description: 'Full-stack software engineer role',
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits the create values without a description', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.createResourceRoleType.mockResolvedValue(roleType);
    renderWithProviders(<ResourceRoleTypeForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/role name/i), 'Software Engineer');
    await user.click(screen.getByRole('button', { name: 'Add Role Type' }));

    await waitFor(() => expect(resourceRoleTypesApi.createResourceRoleType).toHaveBeenCalledTimes(1));
    expect(resourceRoleTypesApi.createResourceRoleType).toHaveBeenCalledWith({
      name: 'Software Engineer',
      description: '',
    });
  });

  it('submits the updated values in edit mode and calls onSuccess', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.updateResourceRoleType.mockResolvedValue(roleType);
    renderWithProviders(
      <ResourceRoleTypeForm mode="edit" roleType={roleType} onSuccess={onSuccess} onCancel={onCancel} />
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(resourceRoleTypesApi.updateResourceRoleType).toHaveBeenCalledTimes(1));
    expect(resourceRoleTypesApi.updateResourceRoleType).toHaveBeenCalledWith(roleType.id, {
      name: roleType.name,
      description: roleType.description,
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('surfaces a server error without calling onSuccess', async () => {
    const user = userEvent.setup();
    resourceRoleTypesApi.createResourceRoleType.mockRejectedValue(new Error('Role name already exists.'));
    renderWithProviders(<ResourceRoleTypeForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/role name/i), 'Software Engineer');
    await user.click(screen.getByRole('button', { name: 'Add Role Type' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResourceRoleTypeForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
