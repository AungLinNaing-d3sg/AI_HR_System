'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useProject } from '@/hooks/useProject';
import { useDeleteProject } from '@/hooks/useDeleteProject';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProjectForm } from '@/components/forms/ProjectForm';

/**
 * View/Edit/Delete container for a single project (`/projects/[id]`).
 * Fetches the project client-side via `useProject` (loading/error/not-found
 * states handled here) and composes the shared `ProjectForm` (view + update)
 * with a destructive "Delete project" action confirmed via `ConfirmDialog`.
 */
export function ProjectEditPanel({ id }: { id: string }) {
  const router = useRouter();
  const { project, isLoading, isError, error } = useProject(id);
  const { deleteProject, isDeleting, error: deleteError } = useDeleteProject();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteProject(id);
      router.push('/projects');
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading project…
      </p>
    );
  }

  if (isError || !project) {
    return <Alert variant="error">{error ?? 'This project could not be found.'}</Alert>;
  }

  return (
    <div className="space-y-6">
      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      <ProjectForm mode="edit" project={project} />

      <div className="border-t border-zinc-200 pt-4">
        <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
          Delete project
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete project"
        description={`Are you sure you want to delete "${project.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
