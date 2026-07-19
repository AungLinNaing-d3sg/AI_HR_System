import { axiosInstance } from '@/lib/api/axios';
import type { AuthResponsePayload, CreateUserResponsePayload } from '@/types/api.types';
import type { AuthenticatedUser, CreatedUser } from '@/types/domain.types';
import type {
  ChangePasswordFormValues,
  CreateUserFormValues,
  LoginFormValues,
  UpdateProfileFormValues,
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
