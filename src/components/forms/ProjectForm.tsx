'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { useCreateProject } from '@/hooks/useCreateProject';
import { useUpdateProject } from '@/hooks/useUpdateProject';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  updateProjectSchema,
  type ProjectFormFieldValues,
  type UpdateProjectFormValues,
} from '@/lib/validators/project.validators';
import type { Project } from '@/types/domain.types';

export interface ProjectFormProps {
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`; supplies the pre-filled values and the id to update. */
  project?: Project;
}

function toFormValues(project?: Project): ProjectFormFieldValues {
  return {
    code: project?.code ?? '',
    name: project?.name ?? '',
    description: project?.description ?? '',
    clientName: project?.clientName ?? '',
    clientEmail: project?.clientEmail ?? '',
    startDate: project?.startDate ?? '',
    endDate: project?.endDate ?? '',
    maxDailyHours: project?.maxDailyHours ?? undefined,
    isActive: project?.isActive ?? true,
  };
}

/**
 * Shared Create/Edit project form. Both modes are validated against
 * `updateProjectSchema` (the superset that also requires `isActive`) so a
 * single, fully-typed `useForm` instance can serve both flows; in `create`
 * mode the always-defaulted `isActive` value is simply never sent to the
 * backend (`CreateProject` doesn't accept it - see
 * docs/HR_System_BE.postman_collection.json) and its control isn't shown.
 */
export function ProjectForm({ mode, project }: ProjectFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const { createProject, isCreating, error: createError, reset: resetCreate } = useCreateProject();
  const {
    updateProject,
    isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = useUpdateProject(project?.id ?? '');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormFieldValues, unknown, UpdateProjectFormValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: toFormValues(project),
  });

  const isSubmitting = isEditMode ? isUpdating : isCreating;
  const submitError = isEditMode ? updateError : createError;

  const onSubmit = async (values: UpdateProjectFormValues) => {
    resetCreate();
    resetUpdate();
    try {
      if (isEditMode) {
        await updateProject(values);
      } else {
        // `CreateProject` doesn't accept `isActive` (see docs/HR_System_BE.postman_collection.json),
        // so only the fields it does accept are forwarded here.
        const { code, name, description, clientName, clientEmail, startDate, endDate, maxDailyHours } =
          values;
        await createProject({
          code,
          name,
          description,
          clientName,
          clientEmail,
          startDate,
          endDate,
          maxDailyHours,
        });
      }
      router.push('/projects');
    } catch {
      // Surfaced via `submitError` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-2xl space-y-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Project name</Label>
          <Input
            id="name"
            autoComplete="off"
            placeholder="e.g. Project Alpha - Web Platform"
            hasError={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>

        <div>
          <Label htmlFor="code">Project code</Label>
          <Input
            id="code"
            autoComplete="off"
            placeholder="e.g. PRJ-GAMMA"
            hasError={Boolean(errors.code)}
            aria-describedby={errors.code ? 'code-error' : 'code-help'}
            {...register('code')}
          />
          <p id="code-help" className="mt-1 text-xs text-zinc-500">
            Unique. Uppercase letters, numbers, and hyphens only.
          </p>
          <FieldError id="code-error" message={errors.code?.message} />
        </div>

        <div>
          <Label htmlFor="clientName">Client name</Label>
          <Input
            id="clientName"
            autoComplete="off"
            placeholder="e.g. Acme Corp"
            hasError={Boolean(errors.clientName)}
            aria-describedby={errors.clientName ? 'clientName-error' : undefined}
            {...register('clientName')}
          />
          <FieldError id="clientName-error" message={errors.clientName?.message} />
        </div>

        <div>
          <Label htmlFor="clientEmail">Client email (optional)</Label>
          <Input
            id="clientEmail"
            type="email"
            autoComplete="off"
            placeholder="e.g. client@acme.com"
            hasError={Boolean(errors.clientEmail)}
            aria-describedby={errors.clientEmail ? 'clientEmail-error' : undefined}
            {...register('clientEmail')}
          />
          <FieldError id="clientEmail-error" message={errors.clientEmail?.message} />
        </div>

        <div>
          <Label htmlFor="maxDailyHours">Max daily hours (optional)</Label>
          <Input
            id="maxDailyHours"
            type="number"
            min={0}
            max={24}
            step="0.5"
            autoComplete="off"
            hasError={Boolean(errors.maxDailyHours)}
            aria-describedby={errors.maxDailyHours ? 'maxDailyHours-error' : undefined}
            {...register('maxDailyHours')}
          />
          <FieldError id="maxDailyHours-error" message={errors.maxDailyHours?.message} />
        </div>

        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            hasError={Boolean(errors.startDate)}
            aria-describedby={errors.startDate ? 'startDate-error' : undefined}
            {...register('startDate')}
          />
          <FieldError id="startDate-error" message={errors.startDate?.message} />
        </div>

        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            type="date"
            hasError={Boolean(errors.endDate)}
            aria-describedby={errors.endDate ? 'endDate-error' : undefined}
            {...register('endDate')}
          />
          <FieldError id="endDate-error" message={errors.endDate?.message} />
        </div>

        {isEditMode && (
          <div>
            <Label htmlFor="isActive">Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  id="isActive"
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  value={field.value ? 'true' : 'false'}
                  onChange={(event) => field.onChange(event.target.value === 'true')}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              )}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Optional project description…"
            hasError={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : undefined}
            {...register('description')}
          />
          <FieldError id="description-error" message={errors.description?.message} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.push('/projects')}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Save Project'}
        </Button>
      </div>
    </form>
  );
}
