import { mapAuthUser, mapRole, mapRoleList, mapUserListItem, mapUserListItemList } from './mapAuthUser';
import type { MapAuthUserDto } from './mapAuthUser';
import type { RoleDto, UserListItemDto } from '@/types/api.types';

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

describe('mapRole', () => {
  const roleDto: RoleDto = { Id: 'role-1', Name: 'SystemAdmin', Description: 'Full system access' };

  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapRole(roleDto)).toEqual({ id: 'role-1', name: 'SystemAdmin', description: 'Full system access' });
  });

  it('passes through a null description unchanged', () => {
    expect(mapRole({ ...roleDto, Description: null }).description).toBeNull();
  });
});

describe('mapRoleList', () => {
  const roleDto: RoleDto = { Id: 'role-1', Name: 'SystemAdmin', Description: null };

  it('maps an array of DTOs', () => {
    const result = mapRoleList([roleDto, { ...roleDto, Id: 'role-2', Name: 'ProjectAdmin' }]);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ id: 'role-2', name: 'ProjectAdmin', description: null });
  });

  it('returns an empty array for an empty list', () => {
    expect(mapRoleList([])).toEqual([]);
  });
});

describe('mapUserListItem', () => {
  const userListItemDto: UserListItemDto = {
    UserId: 'user-2',
    Username: 'jane.doe',
    Email: 'jane@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: 'EMP-002',
  };

  it('maps only the fields the domain model declares', () => {
    expect(mapUserListItem(userListItemDto)).toEqual({
      userId: 'user-2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    });
  });
});

describe('mapUserListItemList', () => {
  const userListItemDto: UserListItemDto = {
    UserId: 'user-2',
    Username: 'jane.doe',
    Email: 'jane@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: null,
  };

  it('maps an array of DTOs', () => {
    const result = mapUserListItemList([userListItemDto, { ...userListItemDto, UserId: 'user-3' }]);
    expect(result).toHaveLength(2);
    expect(result[1].userId).toBe('user-3');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapUserListItemList([])).toEqual([]);
  });
});
