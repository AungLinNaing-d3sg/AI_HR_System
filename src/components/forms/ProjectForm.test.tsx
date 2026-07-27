import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ProjectForm } from './ProjectForm';
import type { Project } from '@/types/domain.types';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('../../lib/api/projects.api', () => ({
  createProject: jest.fn(),
  updateProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as {
  createProject: jest.Mock;
  updateProject: jest.Mock;
};

const project: Project = {
  id: 'project-1',
  code: 'PRJ-ALPHA',
  name: 'Project Alpha - Web Platform',
  description: 'Frontend platform work',
  clientName: 'Acme Corp',
  clientEmail: 'client@acme.com',
  startDate: '2025-01-15',
  endDate: '2025-12-31',
  maxDailyHours: 8,
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProjectForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    projectsApi.createProject.mockReset();
    projectsApi.updateProject.mockReset();
  });

  it('renders empty required fields in create mode and does not show the status control', () => {
    renderWithProviders(<ProjectForm mode="create" />);

    expect(screen.getByLabelText(/project name/i)).toHaveValue('');
    expect(screen.getByLabelText(/project code/i)).toHaveValue('');
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Project' })).toBeInTheDocument();
  });

  it('pre-fills fields with the given project in edit mode and shows the status control', () => {
    renderWithProviders(<ProjectForm mode="edit" project={project} />);

    expect(screen.getByLabelText(/project name/i)).toHaveValue(project.name);
    expect(screen.getByLabelText(/project code/i)).toHaveValue(project.code);
    expect(screen.getByLabelText(/client name/i)).toHaveValue(project.clientName);
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when required fields are missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectForm mode="create" />);

    await user.click(screen.getByRole('button', { name: 'Save Project' }));

    expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
    expect(projectsApi.createProject).not.toHaveBeenCalled();
  });

  it('submits normalized values and redirects to /projects on successful create', async () => {
    const user = userEvent.setup();
    projectsApi.createProject.mockResolvedValue({ ...project, id: 'project-2', code: 'PRJ-002' });
    renderWithProviders(<ProjectForm mode="create" />);

    await user.type(screen.getByLabelText(/project name/i), 'New Project');
    await user.type(screen.getByLabelText(/project code/i), 'prj-002');
    await user.click(screen.getByRole('button', { name: 'Save Project' }));

    await waitFor(() => expect(projectsApi.createProject).toHaveBeenCalledTimes(1));
    expect(projectsApi.createProject.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'New Project', code: 'PRJ-002' })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/projects'));
  });

  it('submits the update payload including isActive and redirects on successful edit', async () => {
    const user = userEvent.setup();
    projectsApi.updateProject.mockResolvedValue(project);
    renderWithProviders(<ProjectForm mode="edit" project={project} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(projectsApi.updateProject).toHaveBeenCalledTimes(1));
    expect(projectsApi.updateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ code: 'PRJ-ALPHA', name: project.name, isActive: true })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/projects'));
  });

  it('surfaces a server error without redirecting', async () => {
    const user = userEvent.setup();
    projectsApi.createProject.mockRejectedValue(new Error('Duplicate project code.'));
    renderWithProviders(<ProjectForm mode="create" />);

    await user.type(screen.getByLabelText(/project name/i), 'New Project');
    await user.type(screen.getByLabelText(/project code/i), 'PRJ-003');
    await user.click(screen.getByRole('button', { name: 'Save Project' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navigates to /projects when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectForm mode="create" />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(pushMock).toHaveBeenCalledWith('/projects');
  });
});
