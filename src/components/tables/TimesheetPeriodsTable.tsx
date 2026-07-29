'use client';

import { useState } from 'react';
import { Lock, Trash2, Unlock } from 'lucide-react';
import { useTimesheetPeriods } from '@/hooks/useTimesheetPeriods';
import { useDeleteTimesheetPeriod } from '@/hooks/useDeleteTimesheetPeriod';
import { useLockTimesheetPeriod } from '@/hooks/useLockTimesheetPeriod';
import { useUnlockTimesheetPeriod } from '@/hooks/useUnlockTimesheetPeriod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import type { TimesheetPeriod } from '@/types/domain.types';

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatRange(period: TimesheetPeriod): string {
  return `${formatDate(period.periodStart)} – ${formatDate(period.periodEnd)}`;
}

/**
 * Lists every timesheet period with its lock status and row actions (Lock/
 * Unlock, Delete), backing the `/timesheets/periods` page. Locking a period
 * blocks other users from logging further hours against it, so - like
 * deleting - it is confirmed via `ConfirmDialog`; unlocking only restores an
 * ability and is a single direct action, matching this app's existing
 * risk-weighted confirmation pattern (see `ProjectsTable`).
 */
export function TimesheetPeriodsTable() {
  const { periods, isLoading, isError, error, refetch } = useTimesheetPeriods();
  const { deleteTimesheetPeriod, isDeleting, error: deleteError, reset: resetDeleteError } =
    useDeleteTimesheetPeriod();
  const { lockTimesheetPeriod, isLocking, error: lockError, reset: resetLockError } = useLockTimesheetPeriod();
  const { unlockTimesheetPeriod, isUnlocking, error: unlockError, reset: resetUnlockError } =
    useUnlockTimesheetPeriod();

  const [pendingDelete, setPendingDelete] = useState<TimesheetPeriod | null>(null);
  const [pendingLock, setPendingLock] = useState<TimesheetPeriod | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteTimesheetPeriod(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  const handleConfirmLock = async () => {
    if (!pendingLock) return;
    try {
      await lockTimesheetPeriod(pendingLock.id);
      setPendingLock(null);
    } catch {
      // Surfaced via `lockError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  const handleUnlock = async (period: TimesheetPeriod) => {
    resetUnlockError();
    setUnlockingId(period.id);
    try {
      await unlockTimesheetPeriod(period.id);
    } catch {
      // Surfaced via `unlockError` below.
    } finally {
      setUnlockingId(null);
    }
  };

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading timesheet periods…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load timesheet periods.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900">Timesheet Periods</h2>

      {(deleteError || lockError || unlockError) && (
        <div className="mb-4">
          <Alert variant="error">{deleteError ?? lockError ?? unlockError}</Alert>
        </div>
      )}

      {periods.length === 0 ? (
        <p className="text-sm text-zinc-500">No timesheet periods have been created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">Timesheet periods with their lock status and actions.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
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
              {periods.map((period) => (
                <tr key={period.id}>
                  <td className="px-4 py-3 text-zinc-900">{formatDate(period.periodStart)}</td>
                  <td className="px-4 py-3 text-zinc-900">{formatDate(period.periodEnd)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        period.isLocked ? 'bg-zinc-200 text-zinc-700' : 'bg-green-100 text-green-800'
                      )}
                    >
                      {period.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {period.isLocked ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={isUnlocking && unlockingId === period.id}
                          onClick={() => handleUnlock(period)}
                        >
                          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                          Unlock
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            resetLockError();
                            setPendingLock(period);
                          }}
                        >
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          Lock
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          resetDeleteError();
                          setPendingDelete(period);
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
      )}

      <ConfirmDialog
        open={pendingLock !== null}
        title="Lock timesheet period"
        description={
          pendingLock
            ? `Locking ${formatRange(pendingLock)} will prevent any user from logging or editing hours against it. Continue?`
            : ''
        }
        confirmLabel="Lock"
        isConfirming={isLocking}
        onConfirm={handleConfirmLock}
        onCancel={() => setPendingLock(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete timesheet period"
        description={
          pendingDelete
            ? `Are you sure you want to delete ${formatRange(pendingDelete)}? This cannot be undone.`
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
