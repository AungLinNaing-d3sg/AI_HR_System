import { mapAuthUser } from './mapAuthUser';
import type { MapAuthUserDto } from './mapAuthUser';

describe('mapAuthUser', () => {
  const dto: MapAuthUserDto = {
    UserId: 'user-1',
    Username: 'jdoe',
    Email: 'jdoe@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: 'EMP-001',
    CountryId: 'country-1',
  };

  it('maps the PascalCase DTO plus the explicit role to the camelCase domain model', () => {
    expect(mapAuthUser(dto, 'ProjectAdmin')).toEqual({
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
    const nullableDto: MapAuthUserDto = { ...dto, EmployeeId: null, CountryId: null };
    const mapped = mapAuthUser(nullableDto, 'ProjectAdmin');
    expect(mapped.employeeId).toBeNull();
    expect(mapped.countryId).toBeNull();
  });

  it('defaults employeeId/countryId to null when the backend omits them (e.g. Login/UpdateProfile)', () => {
    const minimalDto: MapAuthUserDto = {
      UserId: 'user-1',
      Username: 'jdoe',
      Email: 'jdoe@example.com',
      FirstName: 'Jane',
      LastName: 'Doe',
    };
    const mapped = mapAuthUser(minimalDto, 'User');
    expect(mapped.employeeId).toBeNull();
    expect(mapped.countryId).toBeNull();
  });

  it('never forwards fields outside of the declared domain shape', () => {
    const mapped = mapAuthUser(dto, 'ProjectAdmin') as unknown as Record<string, unknown>;
    expect(Object.keys(mapped).sort()).toEqual(
      ['id', 'username', 'email', 'firstName', 'lastName', 'employeeId', 'countryId', 'role'].sort()
    );
  });
});
