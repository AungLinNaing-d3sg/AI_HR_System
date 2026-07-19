/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as projectsBackend from './projectsBackend.api';

describe('projectsBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
  });

  it('getProjectList gets /Project/GetProjectList with a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: [] });
    await projectsBackend.getProjectList('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Project/GetProjectList', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('getProject gets /Project/GetProject/:id with a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Id: 'project-1' } });
    await projectsBackend.getProject('project-1', 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Project/GetProject/project-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('createProject posts to /Project/CreateProject with a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: { Id: 'project-1' } });
    const payload = { Code: 'PRJ-001', Name: 'Sample Project' };
    await projectsBackend.createProject(payload, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/Project/CreateProject', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('updateProject puts to /Project/UpdateProject/:id with a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'project-1' } });
    const payload = { Code: 'PRJ-001', Name: 'Updated Project Name', IsActive: true };
    await projectsBackend.updateProject('project-1', payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Project/UpdateProject/project-1', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('deleteProject deletes /Project/DeleteProject/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: {} });
    await projectsBackend.deleteProject('project-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/Project/DeleteProject/project-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('getProjectAssignments gets /Project/GetProjectAssignments/:id with a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: [] });
    await projectsBackend.getProjectAssignments('project-1', 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Project/GetProjectAssignments/project-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('assignResource posts to /Project/AssignResource/:id with a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: { Id: 'assignment-1' } });
    const payload = { UserId: 'user-1', ResourceRoleTypeId: 'role-1' };
    await projectsBackend.assignResource('project-1', payload, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/Project/AssignResource/project-1', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('removeResource deletes /Project/RemoveResource/:projectId/:assignmentId with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await projectsBackend.removeResource('project-1', 'assignment-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/Project/RemoveResource/project-1/assignment-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });
});
