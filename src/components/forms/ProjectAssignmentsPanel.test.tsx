import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ProjectAssignmentsPanel } from './ProjectAssignmentsPanel';
import type { ProjectAssignment, ResourceRoleType, UserListItem } from '@/types/domain.types';

jest.mock('../../lib/api/projects.api', () => ({
  getProject: jest.fn(),
  getProjectAssignments: jest.fn(),
  assignResource: jest.fn(),
  removeResource: jest.fn(),
}));

jest.mock('../../lib/api/auth.api', () => ({
  getUserList: jest.fn(),
  searchUsers: jest.fn(),
}));

jest.mock('../../lib/api/resourceRoleTypes.api', () => ({
  getResourceRoleTypes: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as {
  getProject: jest.Mock;
  getProjectAssignments: jest.Mock;
  assignResource: jest.Mock;
  removeResource: jest.Mock;
};

const authApi = jest.requireMock('../../lib/api/auth.api') as {
  getUserList: jest.Mock;
  searchUsers: jest.Mock;
};

const resourceRoleTypesApi = jest.requireMock('../../lib/api/resourceRoleTypes.api') as {
  getResourceRoleTypes: jest.Mock;
};

const assignments: ProjectAssignment[] = [
  {
    id: 'assignment-1',
    userId: 'user-1',
    firstName: 'Alex',
    lastName: 'Kumar',
    email: 'alex.kumar@example.com',
    resourceRoleTypeId: 'role-1',
    roleName: 'Senior Developer',
    assignedAt: '2026-06-18T14:11:57',
    isActive: true,
  },
];

const candidateUsers: UserListItem[] = [
  { userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
];

const roleTypes: ResourceRoleType[] = [{ id: 'role-1', name: 'Senior Developer', description: null }];

const project = {
  id: 'project-1',
  code: 'PRJ-ALPHA',
  name: 'Project Alpha - Web Platform',
  description: null,
  clientName: 'Acme Corp',
  clientEmail: null,
  startDate: '2025-01-15',
  endDate: '2025-12-31',
  maxDailyHours: null,
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProjectAssignmentsPanel', () => {
  beforeEach(() => {
    projectsApi.getProject.mockReset();
    projectsApi.getProjectAssignments.mockReset();
    projectsApi.assignResource.mockReset();
    projectsApi.removeResource.mockReset();
    authApi.getUserList.mockReset();
    authApi.searchUsers.mockReset();
    resourceRoleTypesApi.getResourceRoleTypes.mockReset();
    projectsApi.getProject.mockResolvedValue(project);
    authApi.getUserList.mockResolvedValue(candidateUsers);
    authApi.searchUsers.mockResolvedValue(candidateUsers);
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue(roleTypes);
  });

  it('shows a loading state initially', () => {
    projectsApi.getProjectAssignments.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);
    expect(screen.getByText(/loading assignments/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when assignments fail to load', async () => {
    projectsApi.getProjectAssignments.mockRejectedValue(new Error('network down'));
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty-state row and the searchable user combobox when nobody is assigned yet', async () => {
    projectsApi.getProjectAssignments.mockResolvedValue([]);
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);

    expect(await screen.findByText(/no users are assigned to this project yet/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'User' })).toBeInTheDocument();
  });

  it('renders the assigned user (e.g. Alex Kumar) with their role and a Remove action', async () => {
    projectsApi.getProjectAssignments.mockResolvedValue(assignments);
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);

    expect(await screen.findByText('Alex Kumar')).toBeInTheDocument();
    expect(screen.getAllByText('Senior Developer').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('searches for a user as the admin types and submits the Add User form with the selected user and role', async () => {
    const user = userEvent.setup();
    projectsApi.getProjectAssignments.mockResolvedValue([]);
    projectsApi.assignResource.mockResolvedValue([...assignments]);
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);

    const userField = await screen.findByRole('combobox', { name: 'User' });
    await user.type(userField, 'jane');
    await waitFor(() => expect(authApi.searchUsers).toHaveBeenCalledWith('jane'));

    const option = await screen.findByRole('option', { name: /jane doe/i });
    await user.click(option);

    await user.selectOptions(screen.getByLabelText('Role'), 'role-1');
    await user.click(screen.getByRole('button', { name: 'Add User' }));

    await waitFor(() =>
      expect(projectsApi.assignResource).toHaveBeenCalledWith('project-1', {
        userId: 'user-2',
        resourceRoleTypeId: 'role-1',
      })
    );
  });

  it('shows a validation error when submitting without selecting a user', async () => {
    const user = userEvent.setup();
    projectsApi.getProjectAssignments.mockResolvedValue([]);
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);

    await user.selectOptions(await screen.findByLabelText('Role'), 'role-1');
    await user.click(screen.getByRole('button', { name: 'Add User' }));

    expect(await screen.findByText(/select a user to assign/i)).toBeInTheDocument();
    expect(projectsApi.assignResource).not.toHaveBeenCalled();
  });

  it('opens a confirm dialog before removing and calls removeResource on confirm', async () => {
    const user = userEvent.setup();
    projectsApi.getProjectAssignments.mockResolvedValue(assignments);
    projectsApi.removeResource.mockResolvedValue(undefined);
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);

    await screen.findByText('Alex Kumar');
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/remove alex kumar from this project/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(projectsApi.removeResource).toHaveBeenCalledWith('project-1', 'assignment-1'));
  });

  it('closes the confirm dialog without removing when cancelled', async () => {
    const user = userEvent.setup();
    projectsApi.getProjectAssignments.mockResolvedValue(assignments);
    renderWithProviders(<ProjectAssignmentsPanel projectId="project-1" />);

    await screen.findByText('Alex Kumar');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(projectsApi.removeResource).not.toHaveBeenCalled();
  });
});
