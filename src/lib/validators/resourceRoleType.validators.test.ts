import { createResourceRoleTypeSchema, updateResourceRoleTypeSchema } from './resourceRoleType.validators';

const validPayload = {
  name: 'Software Engineer',
  description: 'Full-stack software engineer role',
};

describe('createResourceRoleTypeSchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(createResourceRoleTypeSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a payload with no description', () => {
    const result = createResourceRoleTypeSchema.safeParse({ name: 'Software Engineer' });
    expect(result.success).toBe(true);
  });

  it('accepts a payload with an empty string description', () => {
    const result = createResourceRoleTypeSchema.safeParse({ ...validPayload, description: '' });
    expect(result.success).toBe(true);
  });

  it('trims the name', () => {
    const result = createResourceRoleTypeSchema.safeParse({ ...validPayload, name: '  Software Engineer  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Software Engineer');
    }
  });

  it('rejects a missing name', () => {
    const result = createResourceRoleTypeSchema.safeParse({ ...validPayload, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is only whitespace', () => {
    const result = createResourceRoleTypeSchema.safeParse({ ...validPayload, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too long', () => {
    const result = createResourceRoleTypeSchema.safeParse({ ...validPayload, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects a description that is too long', () => {
    const result = createResourceRoleTypeSchema.safeParse({ ...validPayload, description: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('updateResourceRoleTypeSchema', () => {
  it('accepts the same shape as create', () => {
    expect(updateResourceRoleTypeSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = updateResourceRoleTypeSchema.safeParse({ ...validPayload, name: '' });
    expect(result.success).toBe(false);
  });
});
