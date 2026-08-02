'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectList } from '@/hooks/useProjectList';
import { useDeleteProject } from '@/hooks/useDeleteProject';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import type { Project } from '@/types/domain.types';

const ACTION_LINK_CLASSNAME =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900';

const DISABLED_ACTION_CLASSNAME =
  'inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-sm font-medium text-zinc-400';

/** A plain `User` (the backend's "Employee" role) only works their own assigned projects and cannot assign resources to them. */
const ASSIGN_DISABLED_MESSAGE = 'Only a System Admin or Project Admin can assign resources to a project.';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Lists projects with Assign/Edit/Delete row actions. Handles loading,
 * error, and empty states. Scoped to the caller's own projects
 * (`GetMyProjectList`) for a `ProjectAdmin` or plain `User` (the backend's
 * "Employee" role), or every project (`GetProjectList`) for a `SystemAdmin`/
 * `Guest` - see `useProjectList`. The Assign action is disabled (with an
 * explanatory `title` tooltip) for a plain `User`, who can only view - not
 * manage - resource assignments.
 */
export function ProjectsTable() {
  const { role } = useAuth();
  console.log('logggggggggggg role;;;', role)
  const canAssign = role !== 'User';
  const { projects, isLoading, isError, error, refetch } = useProjectList();
  const { deleteProject, isDeleting, error: deleteError, reset: resetDeleteError } = useDeleteProject();
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProject(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading projects…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load projects.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
        <p className="text-sm text-zinc-600">No projects yet.</p>
        <Link
          href="/projects/new"
          className="mt-2 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
        >
          Create your first project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">List of client projects with their status and actions.</caption>
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Code
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Project name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Client
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Start date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                End date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {projects.map((project) => (
              <tr key={project.id}>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700">
                    {project.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">{project.name}</td>
                <td className="px-4 py-3 text-zinc-600">{project.clientName ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-600">{formatDate(project.startDate)}</td>
                <td className="px-4 py-3 text-zinc-600">{formatDate(project.endDate)}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      project.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-700'
                    )}
                  >
                    {project.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {canAssign ? (
                      <Link href={`/projects/${project.id}/assignments`} className={ACTION_LINK_CLASSNAME}>
                        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        Assign
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title={ASSIGN_DISABLED_MESSAGE}
                        className={DISABLED_ACTION_CLASSNAME}
                      >
                        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        Assign
                      </button>
                    )}
                    <Link href={`/projects/${project.id}`} className={ACTION_LINK_CLASSNAME}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetDeleteError();
                        setPendingDelete(project);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete project"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
