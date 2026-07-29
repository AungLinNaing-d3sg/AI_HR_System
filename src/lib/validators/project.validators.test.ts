import { assignResourceSchema, createProjectSchema, updateProjectSchema } from './project.validators';

const validCreatePayload = {
  code: 'PRJ-001',
  name: 'Sample Project',
  description: 'A sample project description',
  clientName: 'Acme Corp',
  clientEmail: 'client@acme.com',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  maxDailyHours: 8,
};

describe('createProjectSchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(createProjectSchema.safeParse(validCreatePayload).success).toBe(true);
  });

  it('accepts a payload with only the required fields', () => {
    const result = createProjectSchema.safeParse({ code: 'PRJ-002', name: 'Minimal Project' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing code', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a lowercase/invalid code', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, code: 'prj 001' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, name: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid client email', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, clientEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty client email', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, clientEmail: '' });
    expect(result.success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = createProjectSchema.safeParse({
      ...validCreatePayload,
      startDate: '2025-12-31',
      endDate: '2025-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endDate).toBeTruthy();
    }
  });

  it('rejects a non-numeric max daily hours', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, maxDailyHours: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects max daily hours above the 24-hour limit', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, maxDailyHours: 25 });
    expect(result.success).toBe(false);
  });

  it('rejects max daily hours that are zero or negative', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, maxDailyHours: 0 });
    expect(result.success).toBe(false);
  });

  it('treats an empty max daily hours string as omitted', () => {
    const result = createProjectSchema.safeParse({ ...validCreatePayload, maxDailyHours: '' });
    expect(result.success).toBe(true);
  });
});

describe('updateProjectSchema', () => {
  it('requires isActive to be a boolean', () => {
    const result = updateProjectSchema.safeParse({ ...validCreatePayload, isActive: 'yes' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid update payload', () => {
    const result = updateProjectSchema.safeParse({ ...validCreatePayload, isActive: false });
    expect(result.success).toBe(true);
  });
});

describe('assignResourceSchema', () => {
  it('accepts a valid payload', () => {
    const result = assignResourceSchema.safeParse({ userId: 'user-1', resourceRoleTypeId: 'role-1' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing userId', () => {
    const result = assignResourceSchema.safeParse({ userId: '', resourceRoleTypeId: 'role-1' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing resourceRoleTypeId', () => {
    const result = assignResourceSchema.safeParse({ userId: 'user-1', resourceRoleTypeId: '' });
    expect(result.success).toBe(false);
  });
});
