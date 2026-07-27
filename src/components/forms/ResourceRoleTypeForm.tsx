'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateResourceRoleType } from '@/hooks/useCreateResourceRoleType';
import { useUpdateResourceRoleType } from '@/hooks/useUpdateResourceRoleType';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
  createResourceRoleTypeSchema,
  type CreateResourceRoleTypeFormValues,
  type ResourceRoleTypeFormFieldValues,
} from '@/lib/validators/resourceRoleType.validators';
import type { ResourceRoleType } from '@/types/domain.types';

export interface ResourceRoleTypeFormProps {
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`; supplies the pre-filled values and the id to update. */
  roleType?: ResourceRoleType;
  /** Called after a successful create/update so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
}

function toFormValues(roleType?: ResourceRoleType): ResourceRoleTypeFormFieldValues {
  return {
    name: roleType?.name ?? '',
    description: roleType?.description ?? '',
  };
}

/**
 * Shared Create/Edit resource role type form, rendered inside
 * `ResourceRoleTypesTable`'s modal (there is no dedicated Resource Role Type
 * screen in `docs/HR_System_FE_wireframe.pdf` - it only shows
 * Users/Currencies/Exchange Rates/Rate Cards/Countries under Administration
 * - so this mirrors those existing reference-data admin pages instead,
 * following `CountryForm`/`CurrencyForm`'s "+ Add"/"Edit" modal pattern
 * rather than introducing a separate routed page).
 *
 * Both modes are validated against `createResourceRoleTypeSchema` (the
 * backend's `CreateResourceRoleType`/`UpdateResourceRoleType` endpoints
 * accept the identical `Name`/`Description` shape - see
 * docs/HR_System_BE.postman_collection.json) so a single, fully-typed
 * `useForm` instance can serve both flows.
 */
export function ResourceRoleTypeForm({ mode, roleType, onSuccess, onCancel }: ResourceRoleTypeFormProps) {
  const isEditMode = mode === 'edit';

  const {
    createResourceRoleType,
    isCreating,
    error: createError,
    reset: resetCreate,
  } = useCreateResourceRoleType();
  const {
    updateResourceRoleType,
    isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = useUpdateResourceRoleType(roleType?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResourceRoleTypeFormFieldValues, unknown, CreateResourceRoleTypeFormValues>({
    resolver: zodResolver(createResourceRoleTypeSchema),
    defaultValues: toFormValues(roleType),
  });

  const isSubmitting = isEditMode ? isUpdating : isCreating;
  const submitError = isEditMode ? updateError : createError;

  const onSubmit = async (values: CreateResourceRoleTypeFormValues) => {
    resetCreate();
    resetUpdate();
    try {
      if (isEditMode) {
        await updateResourceRoleType(values);
      } else {
        await createResourceRoleType(values);
      }
      onSuccess();
    } catch {
      // Surfaced via `submitError` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      <div>
        <Label htmlFor="name">Role name</Label>
        <Input
          id="name"
          autoComplete="off"
          placeholder="e.g. Senior Developer"
          hasError={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        <FieldError id="name-error" message={errors.name?.message} />
      </div>

      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Optional role description…"
          hasError={Boolean(errors.description)}
          aria-describedby={errors.description ? 'description-error' : undefined}
          {...register('description')}
        />
        <FieldError id="description-error" message={errors.description?.message} />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Add Role Type'}
        </Button>
      </div>
    </form>
  );
}
