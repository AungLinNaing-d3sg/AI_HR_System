import { mapAuthUser } from './mapAuthUser';
import type { AuthUserDto } from '@/types/api.types';

describe('mapAuthUser', () => {
  const dto: AuthUserDto = {
    Id: 'user-1',
    Username: 'jdoe',
    Email: 'jdoe@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: 'EMP-001',
    CountryId: 'country-1',
    RoleId: 'role-1',
    RoleName: 'ProjectAdmin',
  };

  it('maps the PascalCase DTO to the camelCase domain model', () => {
    expect(mapAuthUser(dto)).toEqual({
      id: 'user-1',
      username: 'jdoe',
      email: 'jdoe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      employeeId: 'EMP-001',
      countryId: 'country-1',
      role: 'ProjectAdmin',
    });
  });

  it('preserves null optional fields instead of coercing them', () => {
    const nullableDto: AuthUserDto = { ...dto, EmployeeId: null, CountryId: null };
    const mapped = mapAuthUser(nullableDto);
    expect(mapped.employeeId).toBeNull();
    expect(mapped.countryId).toBeNull();
  });

  it('never forwards fields outside of the declared domain shape (e.g. RoleId)', () => {
    const mapped = mapAuthUser(dto) as unknown as Record<string, unknown>;
    expect(mapped.RoleId).toBeUndefined();
    expect(mapped.roleId).toBeUndefined();
    expect(Object.keys(mapped).sort()).toEqual(
      ['id', 'username', 'email', 'firstName', 'lastName', 'employeeId', 'countryId', 'role'].sort()
    );
  });
});
