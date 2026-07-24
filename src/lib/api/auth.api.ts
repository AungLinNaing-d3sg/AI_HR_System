import { axiosInstance } from '@/lib/api/axios';
import type {
  AuthResponsePayload,
  CreateUserResponsePayload,
  RoleListResponsePayload,
  SearchUsersResponsePayload,
  UpdateUserResponsePayload,
  UserListResponsePayload,
  UsersListResponsePayload,
} from '@/types/api.types';
import type { AdminUserListItem, AuthenticatedUser, CreatedUser, Role, UserListItem } from '@/types/domain.types';
import type {
  ChangePasswordFormValues,
  CreateUserFormValues,
  LoginFormValues,
  UpdateProfileFormValues,
  UpdateUserFormValues,
} from '@/lib/validators/auth.validators';

/**
 * Client-side Auth domain module. Hooks (`useAuth`, `useUpdateProfile`,
 * `useChangePassword`, `useCreateUser`) call these functions instead of
 * touching Axios directly; every call here is same-origin, against this
 * app's own `/api/auth/*` Route Handlers, which in turn call the real
 * backend and manage the httpOnly session cookies.
 */

export async function login(values: LoginFormValues): Promise<AuthenticatedUser> {
  const { data } = await axiosInstance.post<AuthResponsePayload>('/auth/login', values);
  return data.user;
}

export async function logout(): Promise<void> {
  await axiosInstance.post('/auth/logout');
}

export async function updateProfile(values: UpdateProfileFormValues): Promise<AuthenticatedUser> {
  const { data } = await axiosInstance.put<AuthResponsePayload>('/auth/profile', values);
  return data.user;
}

export async function changePassword(values: ChangePasswordFormValues): Promise<void> {
  await axiosInstance.put('/auth/change-password', values);
}

export async function createUser(values: CreateUserFormValues): Promise<CreatedUser> {
  const { data } = await axiosInstance.post<CreateUserResponsePayload>('/auth/users', values);
  return data.user;
}

/** Reference data for the Create User `RoleId` dropdown - `SystemAdmin`-only. */
export async function getRoles(): Promise<Role[]> {
  const { data } = await axiosInstance.get<RoleListResponsePayload>('/auth/roles');
  return data.roles;
}

/**
 * Every candidate user for the searchable "Add User to Project" combobox on
 * `/projects/:id/assignments`, shown before the caller has typed anything
 * (and filtered client-side for a query below `MIN_USER_SEARCH_QUERY_LENGTH`)
 * - see `useUserList`/`UserSearchCombobox`.
 */
export async function getUserList(): Promise<UserListItem[]> {
  const { data } = await axiosInstance.get<UserListResponsePayload>('/auth/user-list');
  return data.users;
}

/**
 * Free-text user search for the searchable "Add User to Project" combobox on
 * `/projects/:id/assignments`, once the as-you-type query reaches
 * `MIN_USER_SEARCH_QUERY_LENGTH` (below that, the combobox filters
 * `getUserList`'s already-loaded result set client-side instead - see
 * `useUserSearch`, `useUserList`). `query` is sent to the BFF route as both
 * `email` and `userName`.
 */
export async function searchUsers(query: string): Promise<UserListItem[]> {
  const { data } = await axiosInstance.get<SearchUsersResponsePayload>('/auth/search-users', {
    params: { email: query, userName: query },
  });
  return data.users;
}

export interface UsersPage {
  users: AdminUserListItem[];
  totalCount: number;
}

/** Every user account, for the `SystemAdmin`-only `/admin/users` management table. */
export async function getUsers(): Promise<UsersPage> {
  const { data } = await axiosInstance.get<UsersListResponsePayload>('/auth/users');
  return { users: data.users, totalCount: data.totalCount };
}

/**
 * Updates an existing user account - backs the `SystemAdmin`-only
 * `/admin/users` management table's row-level "Edit" action and its
 * Activate/Deactivate toggle (see `useUpdateUser`).
 */
export async function updateUser(id: string, values: UpdateUserFormValues): Promise<AdminUserListItem> {
  const { data } = await axiosInstance.put<UpdateUserResponsePayload>(`/auth/users/${id}`, values);
  return data.user;
}
