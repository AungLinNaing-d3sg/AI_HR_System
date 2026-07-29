'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UserMinus, UserPlus } from 'lucide-react';
import { useAssignResource } from '@/hooks/useAssignResource';
import { useProject } from '@/hooks/useProject';
import { useProjectAssignments } from '@/hooks/useProjectAssignments';
import { useRemoveResource } from '@/hooks/useRemoveResource';
import { useResourceRoleTypes } from '@/hooks/useResourceRoleTypes';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/common/BackLink';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FieldError } from '@/components/ui/FieldError';
import { getInitials } from '@/lib/utils/getInitials';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { UserSearchCombobox } from '@/components/common/UserSearchCombobox';
import { assignResourceSchema, type AssignResourceFormValues } from '@/lib/validators/project.validators';
import type { ProjectAssignment } from '@/types/domain.types';

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * `/projects/:id/assignments` panel (`docs/HR_System_FE_wireframe.pdf`):
 * lists currently assigned resources with a Remove action per row (confirmed
 * via `ConfirmDialog`), and an "Add User" form whose user field is a
 * searchable combobox (`UserSearchCombobox`) that queries
 * `GET /Auth/SearchUsers?email={q}&userName={q}` as the user types (see
 * `useUserSearch`, `app/api/auth/search-users/route.ts`), replacing the
 * previously used, non-search `useUserList`/`GET /Auth/GetUserList` dropdown
 * (see the removed `app/api/auth/user-list/route.ts`).
 */
export function ProjectAssignmentsPanel({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const {
    assignments,
    isLoading: isLoadingAssignments,
    isError: isAssignmentsError,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useProjectAssignments(projectId);
  const { roleTypes, isLoading: isLoadingRoleTypes } = useResourceRoleTypes();
  const { assignResource, isAssigning, error: assignError, reset: resetAssignError } = useAssignResource(projectId);
  const { removeResource, isRemoving, error: removeError, reset: resetRemoveError } = useRemoveResource(projectId);

  const [pendingRemoval, setPendingRemoval] = useState<ProjectAssignment | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm<AssignResourceFormValues>({
    resolver: zodResolver(assignResourceSchema),
    defaultValues: { userId: '', resourceRoleTypeId: '' },
  });

  const onSubmit = async (values: AssignResourceFormValues) => {
    resetAssignError();
    try {
      await assignResource(values);
      resetForm();
    } catch {
      // Surfaced via `assignError` below.
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoval) return;
    resetRemoveError();
    try {
      await removeResource(pendingRemoval.id);
      setPendingRemoval(null);
    } catch {
      // Surfaced via `removeError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  const header = (
    <header className="flex items-start gap-3">
      <BackLink href={`/projects/${projectId}`} label="Back to Edit Project" />
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">User Assignments</h1>
        <p className="text-sm text-zinc-500">{project?.name ?? ' '}</p>
      </div>
    </header>
  );

  if (isLoadingAssignments) {
    return (
      <div className="space-y-6">
        {header}
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading assignments…
        </p>
      </div>
    );
  }

  if (isAssignmentsError) {
    return (
      <div className="space-y-6">
        {header}
        <div className="space-y-3">
          <Alert variant="error">{assignmentsError ?? 'Could not load this project’s assignments.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetchAssignments()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {removeError && <Alert variant="error">{removeError}</Alert>}

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Assigned Users</h2>
        <p className="mb-4 text-sm text-zinc-500">
          {assignments.length} user{assignments.length === 1 ? '' : 's'} currently assigned
        </p>

        {assignments.length === 0 ? (
          <p className="text-sm text-zinc-500">No users are assigned to this project yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {getInitials(assignment.firstName, assignment.lastName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {assignment.firstName} {assignment.lastName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{assignment.email}</p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 sm:inline-flex">
                  {assignment.roleName}
                </span>
                <span className="hidden shrink-0 text-xs text-zinc-500 md:inline">
                  {formatDate(assignment.assignedAt)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    resetRemoveError();
                    setPendingRemoval(assignment);
                  }}
                >
                  <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-lg border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Add User to Project</h2>
        <p className="mb-4 text-sm text-zinc-500">Search for a user by name or email to assign to this project.</p>

        {assignError && (
          <div className="mb-4">
            <Alert variant="error">{assignError}</Alert>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="userId">User</Label>
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <UserSearchCombobox
                  id="userId"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  hasError={Boolean(errors.userId)}
                  aria-describedby={errors.userId ? 'userId-error' : undefined}
                />
              )}
            />
            <FieldError id="userId-error" message={errors.userId?.message} />
          </div>

          <div>
            <Label htmlFor="resourceRoleTypeId">Role</Label>
            <Select
              id="resourceRoleTypeId"
              hasError={Boolean(errors.resourceRoleTypeId)}
              aria-describedby={errors.resourceRoleTypeId ? 'resourceRoleTypeId-error' : undefined}
              disabled={isLoadingRoleTypes}
              {...register('resourceRoleTypeId')}
            >
              <option value="">{isLoadingRoleTypes ? 'Loading roles…' : 'Select a role'}</option>
              {roleTypes.map((roleType) => (
                <option key={roleType.id} value={roleType.id}>
                  {roleType.name}
                </option>
              ))}
            </Select>
            <FieldError id="resourceRoleTypeId-error" message={errors.resourceRoleTypeId?.message} />
          </div>

          <Button type="submit" isLoading={isAssigning}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {isAssigning ? 'Adding…' : 'Add User'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove assignment"
        description={
          pendingRemoval
            ? `Are you sure you want to remove ${pendingRemoval.firstName} ${pendingRemoval.lastName} from this project?`
            : ''
        }
        confirmLabel="Remove"
        isConfirming={isRemoving}
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
