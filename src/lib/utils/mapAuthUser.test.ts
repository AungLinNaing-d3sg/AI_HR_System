import {
  mapAdminUserListItem,
  mapAdminUserListItemList,
  mapAuthUser,
  mapRole,
  mapRoleList,
  mapUpdateUserResponse,
  mapUserListItem,
  mapUserListItemList,
  mapUserSearchItem,
  mapUserSearchItemList,
} from './mapAuthUser';
import type { MapAuthUserDto } from './mapAuthUser';
import type { UpdateUserResponseDto, RoleDto, UserListItemDto, UserSearchItemDto } from '@/types/api.types';

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

describe('mapUserSearchItem', () => {
  const userSearchItemDto: UserSearchItemDto = {
    UserId: 'user-2',
    Username: 'jane.doe',
    Email: 'jane@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: 'EMP-002',
    RoleName: 'ProjectAdmin',
    CountryId: 'country-1',
    CountryCode: 'SG',
    CountryName: 'Singapore',
    IsActive: true,
  };

  it('maps only the fields the domain model declares, dropping role/country/active-status', () => {
    const mapped = mapUserSearchItem(userSearchItemDto) as unknown as Record<string, unknown>;
    expect(mapped).toEqual({
      userId: 'user-2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    });
    expect(Object.keys(mapped).sort()).toEqual(['userId', 'firstName', 'lastName', 'email'].sort());
  });
});

describe('mapUserSearchItemList', () => {
  const userSearchItemDto: UserSearchItemDto = {
    UserId: 'user-2',
    Username: 'jane.doe',
    Email: 'jane@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: null,
  };

  it('maps an array of DTOs', () => {
    const result = mapUserSearchItemList([userSearchItemDto, { ...userSearchItemDto, UserId: 'user-3' }]);
    expect(result).toHaveLength(2);
    expect(result[1].userId).toBe('user-3');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapUserSearchItemList([])).toEqual([]);
  });
});

describe('mapAdminUserListItem', () => {
  const dto: UserListItemDto = {
    UserId: 'user-2',
    Username: 'jane.doe',
    Email: 'jane@example.com',
    FirstName: 'Jane',
    LastName: 'Doe',
    EmployeeId: 'EMP-002',
    RoleName: 'ProjectAdmin',
    CountryId: 'country-1',
    CountryCode: 'SG',
    CountryName: 'Singapore',
    IsActive: true,
  };

  it('maps every field the /admin/users table needs, unlike mapUserListItem', () => {
    expect(mapAdminUserListItem(dto)).toEqual({
      userId: 'user-2',
      username: 'jane.doe',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      employeeId: 'EMP-002',
      roleName: 'ProjectAdmin',
      countryId: 'country-1',
      countryCode: 'SG',
      countryName: 'Singapore',
      isActive: true,
    });
  });

  it('defaults role/country fields to null and isActive to true when the backend omits them', () => {
    const minimalDto: UserListItemDto = {
      UserId: 'user-3',
      Username: 'admin',
      Email: 'admin@hrsystem.com',
      FirstName: 'System',
      LastName: 'Admin',
      EmployeeId: null,
    };
    expect(mapAdminUserListItem(minimalDto)).toEqual({
      userId: 'user-3',
      username: 'admin',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@hrsystem.com',
      employeeId: null,
      roleName: null,
      countryId: null,
      countryCode: null,
      countryName: null,
      isActive: true,
    });
  });
});

describe('mapAdminUserListItemList', () => {
  it('maps an array of DTOs', () => {
    const dto: UserListItemDto = {
      UserId: 'user-2',
      Username: 'jane.doe',
      Email: 'jane@example.com',
      FirstName: 'Jane',
      LastName: 'Doe',
      EmployeeId: null,
    };
    const result = mapAdminUserListItemList([dto, { ...dto, UserId: 'user-3' }]);
    expect(result).toHaveLength(2);
    expect(result[1].userId).toBe('user-3');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapAdminUserListItemList([])).toEqual([]);
  });
});

describe('mapUpdateUserResponse', () => {
  const dto: UpdateUserResponseDto = {
    UserId: 'user-2',
    Username: 'testedited',
    Email: 'test@d3-sg.com',
    FirstName: 'Lin Thit',
    LastName: 'Htoo',
    EmployeeId: 'EMP002',
    CountryId: 'country-1',
    IsActive: true,
    RoleName: 'SystemAdmin',
  };

  it('maps the PUT /Auth/UpdateUser/{id} response to the admin user list domain model', () => {
    expect(mapUpdateUserResponse(dto)).toEqual({
      userId: 'user-2',
      username: 'testedited',
      firstName: 'Lin Thit',
      lastName: 'Htoo',
      email: 'test@d3-sg.com',
      employeeId: 'EMP002',
      roleName: 'SystemAdmin',
      countryId: 'country-1',
      countryCode: null,
      countryName: null,
      isActive: true,
    });
  });

  it('preserves null employeeId/countryId instead of coercing them', () => {
    const mapped = mapUpdateUserResponse({ ...dto, EmployeeId: null, CountryId: null });
    expect(mapped.employeeId).toBeNull();
    expect(mapped.countryId).toBeNull();
  });
});
