jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as projectsApi from './projects.api';
import type { Project } from '@/types/domain.types';

const project: Project = {
  id: 'project-1',
  code: 'PRJ-001',
  name: 'Sample Project',
  description: null,
  clientName: null,
  clientEmail: null,
  startDate: null,
  endDate: null,
  maxDailyHours: null,
  isActive: true,
};

describe('projects.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getProjects gets /projects and returns the project list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { projects: [project] } });
    const result = await projectsApi.getProjects();
    expect(axiosInstance.get).toHaveBeenCalledWith('/projects');
    expect(result).toEqual([project]);
  });

  it('getProject gets /projects/:id and returns the project', async () => {
    axiosInstance.get.mockResolvedValue({ data: { project } });
    const result = await projectsApi.getProject('project-1');
    expect(axiosInstance.get).toHaveBeenCalledWith('/projects/project-1');
    expect(result).toEqual(project);
  });

  it('createProject posts to /projects and returns the created project', async () => {
    axiosInstance.post.mockResolvedValue({ data: { project } });
    const values = { code: 'PRJ-001', name: 'Sample Project' };
    const result = await projectsApi.createProject(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/projects', values);
    expect(result).toEqual(project);
  });

  it('updateProject puts to /projects/:id and returns the updated project', async () => {
    axiosInstance.put.mockResolvedValue({ data: { project } });
    const values = { code: 'PRJ-001', name: 'Sample Project', isActive: true };
    const result = await projectsApi.updateProject('project-1', values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/projects/project-1', values);
    expect(result).toEqual(project);
  });

  it('deleteProject deletes /projects/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: { success: true } });
    await projectsApi.deleteProject('project-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/projects/project-1');
  });
});
