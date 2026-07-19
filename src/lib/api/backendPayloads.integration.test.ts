/**
 * @jest-environment node
 *
 * Regression guard for a real bug: business logic sits in `*Backend.api.ts`
 * request-object literals, so a typo'd or camelCase key silently reaches the
 * real .NET backend as an unrecognized field. Every request body here is
 * asserted key-for-key against the exact PascalCase examples in
 * docs/HR_System_BE.postman_collection.json - by capturing the real request
 * through `backendClient`'s adapter rather than trusting the TypeScript
 * types (a `Request` interface can't catch a key that's simply never set).
 */
import { backendClient } from '@/lib/api/backendClient';
import * as authBackend from '@/lib/api/authBackend.api';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';

function captureRequestBody(): { get: () => unknown } {
  let captured: unknown;
  backendClient.defaults.adapter = async (config) => {
    captured = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    return {
      data: JSON.stringify({ StatusCode: 200, IsSuccess: true, Message: 'Success', Data: {} }),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  return { get: () => captured };
}

describe('backend request payloads match the Postman collection exactly (PascalCase keys)', () => {
  it('Auth/Login', async () => {
    const capture = captureRequestBody();
    await authBackend.login({ UsernameOrEmail: 'admin', Password: 'Password@123' });
    expect(Object.keys(capture.get() as object).sort()).toEqual(['Password', 'UsernameOrEmail']);
  });

  it('Auth/RefreshToken', async () => {
    const capture = captureRequestBody();
    await authBackend.refreshToken({ RefreshToken: 'r' });
    expect(Object.keys(capture.get() as object).sort()).toEqual(['RefreshToken']);
  });

  it('Auth/Logout', async () => {
    const capture = captureRequestBody();
    await authBackend.logout({ RefreshToken: 'r' }, 'token');
    expect(Object.keys(capture.get() as object).sort()).toEqual(['RefreshToken']);
  });

  it('Auth/UpdateProfile', async () => {
    const capture = captureRequestBody();
    await authBackend.updateProfile(
      { FirstName: 'Lin Thit', LastName: 'Htoo', Email: 'x@example.com', CountryId: null },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual(['CountryId', 'Email', 'FirstName', 'LastName']);
  });

  it('Auth/ChangePassword', async () => {
    const capture = captureRequestBody();
    await authBackend.changePassword(
      { CurrentPassword: 'a', NewPassword: 'b', ConfirmNewPassword: 'b' },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual([
      'ConfirmNewPassword',
      'CurrentPassword',
      'NewPassword',
    ]);
  });

  it('Auth/CreateUser', async () => {
    const capture = captureRequestBody();
    await authBackend.createUser(
      {
        Username: 'ltdev',
        Email: 'ltdev@d3-sg.com',
        Password: 'Password@123',
        FirstName: 'Lin Thit',
        LastName: 'Htoo',
        EmployeeId: 'EMP003',
        CountryId: null,
        RoleId: '11111111-1111-1111-1111-111111111101',
      },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual([
      'CountryId',
      'Email',
      'EmployeeId',
      'FirstName',
      'LastName',
      'Password',
      'RoleId',
      'Username',
    ]);
  });

  it('Project/CreateProject', async () => {
    const capture = captureRequestBody();
    await projectsBackend.createProject(
      {
        Code: 'PRJ-001',
        Name: 'Project Helix',
        Description: 'Straight Through Processing',
        ClientName: 'Tokio Marine',
        ClientEmail: 'x@example.com',
        StartDate: '2025-01-01',
        EndDate: '2025-12-31',
        MaxDailyHours: 20,
      },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual([
      'ClientEmail',
      'ClientName',
      'Code',
      'Description',
      'EndDate',
      'MaxDailyHours',
      'Name',
      'StartDate',
    ]);
  });

  it('Project/UpdateProject', async () => {
    const capture = captureRequestBody();
    await projectsBackend.updateProject(
      'project-1',
      {
        Code: 'PRJ-001',
        Name: 'Project Helix',
        Description: 'Straight Through Processing',
        ClientName: 'Tokio Marine',
        ClientEmail: 'x@example.com',
        StartDate: '2025-01-01',
        EndDate: '2026-12-31',
        MaxDailyHours: 20,
        IsActive: true,
      },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual([
      'ClientEmail',
      'ClientName',
      'Code',
      'Description',
      'EndDate',
      'IsActive',
      'MaxDailyHours',
      'Name',
      'StartDate',
    ]);
  });

  it('Project/AssignResource', async () => {
    const capture = captureRequestBody();
    await projectsBackend.assignResource(
      'project-1',
      { UserId: 'user-1', ResourceRoleTypeId: 'role-1' },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual(['ResourceRoleTypeId', 'UserId']);
  });

  it('TimesheetEntry/CreateTimesheetEntry', async () => {
    const capture = captureRequestBody();
    await timesheetsBackend.createTimesheetEntry(
      {
        ProjectId: 'project-1',
        TimesheetPeriodId: 'period-1',
        EntryDate: '2026-03-07',
        Hours: 6,
        TaskDescription: 'Worked on feature implementation',
      },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual([
      'EntryDate',
      'Hours',
      'ProjectId',
      'TaskDescription',
      'TimesheetPeriodId',
    ]);
  });

  it('TimesheetEntry/UpdateTimesheetEntry', async () => {
    const capture = captureRequestBody();
    await timesheetsBackend.updateTimesheetEntry(
      'entry-1',
      { Hours: 6, TaskDescription: 'Updated task description' },
      'token'
    );
    expect(Object.keys(capture.get() as object).sort()).toEqual(['Hours', 'TaskDescription']);
  });
});
