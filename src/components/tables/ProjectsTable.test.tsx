import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ProjectsTable } from './ProjectsTable';
import type { Project } from '@/types/domain.types';

jest.mock('../../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
  deleteProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as {
  getProjects: jest.Mock;
  deleteProject: jest.Mock;
};

const projects: Project[] = [
  {
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
  },
  {
    id: 'project-2',
    code: 'PRJ-BETA',
    name: 'Project Beta - Mobile App',
    description: null,
    clientName: 'TechStart Inc',
    clientEmail: null,
    startDate: null,
    endDate: null,
    maxDailyHours: null,
    isActive: false,
  },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProjectsTable', () => {
  beforeEach(() => {
    projectsApi.getProjects.mockReset();
    projectsApi.deleteProject.mockReset();
  });

  it('shows a loading state initially', () => {
    projectsApi.getProjects.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ProjectsTable />);
    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it('shows an empty state with a create link when there are no projects', async () => {
    projectsApi.getProjects.mockResolvedValue([]);
    renderWithProviders(<ProjectsTable />);

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your first project/i })).toHaveAttribute(
      'href',
      '/projects/new'
    );
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    projectsApi.getProjects.mockRejectedValue(new Error('network down'));
    renderWithProviders(<ProjectsTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a row per project with code, name, client, and status', async () => {
    projectsApi.getProjects.mockResolvedValue(projects);
    renderWithProviders(<ProjectsTable />);

    expect(await screen.findByText('Project Alpha - Web Platform')).toBeInTheDocument();
    expect(screen.getByText('PRJ-ALPHA')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('links each row Edit action to /projects/:id', async () => {
    projectsApi.getProjects.mockResolvedValue(projects);
    renderWithProviders(<ProjectsTable />);

    await screen.findByText('Project Alpha - Web Platform');
    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks[0]).toHaveAttribute('href', '/projects/project-1');
  });

  it('opens a confirm dialog before deleting and calls deleteProject on confirm', async () => {
    const user = userEvent.setup();
    projectsApi.getProjects.mockResolvedValue(projects);
    projectsApi.deleteProject.mockResolvedValue(undefined);
    renderWithProviders(<ProjectsTable />);

    await screen.findByText('Project Alpha - Web Platform');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(projectsApi.deleteProject).toHaveBeenCalledWith('project-1'));
  });

  it('closes the confirm dialog without deleting when cancelled', async () => {
    const user = userEvent.setup();
    projectsApi.getProjects.mockResolvedValue(projects);
    renderWithProviders(<ProjectsTable />);

    await screen.findByText('Project Alpha - Web Platform');
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(projectsApi.deleteProject).not.toHaveBeenCalled();
  });
});
