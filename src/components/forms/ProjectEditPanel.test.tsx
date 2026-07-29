import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ProjectEditPanel } from './ProjectEditPanel';
import type { Project } from '@/types/domain.types';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('../../lib/api/projects.api', () => ({
  getProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as {
  getProject: jest.Mock;
  updateProject: jest.Mock;
  deleteProject: jest.Mock;
};

const project: Project = {
  id: 'project-1',
  code: 'PRJ-ALPHA',
  name: 'Project Alpha - Web Platform',
  description: null,
  clientName: 'Acme Corp',
  clientEmail: null,
  startDate: '2025-01-15',
  endDate: '2025-12-31',
  maxDailyHours: 8,
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProjectEditPanel', () => {
  beforeEach(() => {
    pushMock.mockReset();
    projectsApi.getProject.mockReset();
    projectsApi.updateProject.mockReset();
    projectsApi.deleteProject.mockReset();
  });

  it('shows a loading state initially', () => {
    projectsApi.getProject.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ProjectEditPanel id="project-1" />);
    expect(screen.getByText(/loading project/i)).toBeInTheDocument();
  });

  it('shows an error state when the project cannot be found', async () => {
    projectsApi.getProject.mockRejectedValue(new Error('not found'));
    renderWithProviders(<ProjectEditPanel id="missing-id" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders the pre-filled form and a delete action once loaded', async () => {
    projectsApi.getProject.mockResolvedValue(project);
    renderWithProviders(<ProjectEditPanel id="project-1" />);

    expect(await screen.findByLabelText(/project name/i)).toHaveValue(project.name);
    expect(screen.getByRole('button', { name: 'Delete project' })).toBeInTheDocument();
  });

  it('opens a confirm dialog and deletes the project on confirm, then redirects', async () => {
    const user = userEvent.setup();
    projectsApi.getProject.mockResolvedValue(project);
    projectsApi.deleteProject.mockResolvedValue(undefined);
    renderWithProviders(<ProjectEditPanel id="project-1" />);

    await screen.findByLabelText(/project name/i);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(projectsApi.deleteProject).toHaveBeenCalledWith('project-1'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/projects'));
  });
});
