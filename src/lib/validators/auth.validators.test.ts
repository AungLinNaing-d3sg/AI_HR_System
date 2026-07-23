import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  searchUsersQuerySchema,
  updateProfileSchema,
} from './auth.validators';

describe('loginSchema', () => {
  it('accepts a valid payload', () => {
    const result = loginSchema.safeParse({
      usernameOrEmail: 'jdoe',
      password: 'Password@123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty usernameOrEmail', () => {
    const result = loginSchema.safeParse({ usernameOrEmail: '  ', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ usernameOrEmail: 'jdoe', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  const base = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
  };

  it('accepts a valid payload without countryId', () => {
    expect(updateProfileSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a null countryId', () => {
    expect(updateProfileSchema.safeParse({ ...base, countryId: null }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = updateProfileSchema.safeParse({ ...base, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a first name over the max length', () => {
    const result = updateProfileSchema.safeParse({ ...base, firstName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'OldPass@123',
    newPassword: 'NewPass@123',
    confirmNewPassword: 'NewPass@123',
  };

  it('accepts a valid payload', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when confirmNewPassword does not match newPassword', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirmNewPassword: 'Different@123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'confirmNewPassword')).toBe(
        true
      );
    }
  });

  it('rejects when the new password is the same as the current password', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: valid.currentPassword,
      confirmNewPassword: valid.currentPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'newPassword')).toBe(true);
    }
  });

  it('rejects a new password that fails the complexity regex', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: 'alllowercase1',
      confirmNewPassword: 'alllowercase1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a new password shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: 'Sh0rt@',
      confirmNewPassword: 'Sh0rt@',
    });
    expect(result.success).toBe(false);
  });
});

describe('createUserSchema', () => {
  const valid = {
    username: 'jdoe',
    email: 'jdoe@example.com',
    password: 'Password@123',
    firstName: 'Jane',
    lastName: 'Doe',
    roleId: '11111111-1111-1111-1111-111111111101',
  };

  it('accepts a minimal valid payload', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a username shorter than 3 characters', () => {
    expect(createUserSchema.safeParse({ ...valid, username: 'jd' }).success).toBe(false);
  });

  it('rejects a weak password', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'password' }).success).toBe(false);
  });

  it('rejects a missing roleId', () => {
    expect(createUserSchema.safeParse({ ...valid, roleId: '' }).success).toBe(false);
  });

  it('rejects a roleId that is not a valid GUID (the backend deserializes it as System.Guid and crashes on anything else)', () => {
    const result = createUserSchema.safeParse({ ...valid, roleId: 'role-1' });
    expect(result.success).toBe(false);
  });

  it('rejects a countryId that is not a valid GUID', () => {
    const result = createUserSchema.safeParse({ ...valid, countryId: 'not-a-guid' });
    expect(result.success).toBe(false);
  });

  it('accepts empty-string optional fields for employeeId/countryId', () => {
    const result = createUserSchema.safeParse({ ...valid, employeeId: '', countryId: '' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid GUID countryId', () => {
    const result = createUserSchema.safeParse({ ...valid, countryId: '22222222-2222-2222-2222-222222222201' });
    expect(result.success).toBe(true);
  });
});

describe('searchUsersQuerySchema', () => {
  it('accepts a query with both email and userName at the minimum length', () => {
    const result = searchUsersQuerySchema.safeParse({ email: 'jd', userName: 'jd' });
    expect(result.success).toBe(true);
  });

  it('accepts a query with only userName present, at the minimum length', () => {
    const result = searchUsersQuerySchema.safeParse({ userName: 'jd' });
    expect(result.success).toBe(true);
  });

  it('accepts a query with only email present, at the minimum length', () => {
    const result = searchUsersQuerySchema.safeParse({ email: 'jd' });
    expect(result.success).toBe(true);
  });

  it('rejects when neither email nor userName is provided', () => {
    const result = searchUsersQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a search term shorter than the minimum length', () => {
    const result = searchUsersQuerySchema.safeParse({ email: 'j', userName: 'j' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty-string search term', () => {
    const result = searchUsersQuerySchema.safeParse({ email: '', userName: '' });
    expect(result.success).toBe(false);
  });
});
