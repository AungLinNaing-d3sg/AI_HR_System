'use client';

import Link from 'next/link';
import { BarChart3, ClipboardCheck, Clock, FolderKanban, UserPlus, User as UserIcon } from 'lucide-react';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useProjects } from '@/hooks/useProjects';
import { useTimesheetWeek } from '@/hooks/useTimesheetWeek';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getMondayOfWeek } from '@/lib/utils/week';
import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types/domain.types';

interface DashboardOverviewProps {
  role: UserRole | null;
}

interface StatCardProps {
  label: string;
  value: string;
  caption: string;
  icon: typeof Clock;
  iconClassName: string;
}

function StatCard({ label, value, caption, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', iconClassName)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="text-sm font-medium text-zinc-900">{label}</p>
      <p className="text-xs text-zinc-500">{caption}</p>
    </div>
  );
}

function formatEntryDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Dashboard's data-driven body: stat cards, recent timesheet entries, and quick actions. Client Component so it can use TanStack Query hooks; only real, already-fetched data is shown (no fabricated Invoices/Active-users cards - those domains have no vertical slice built in this app yet, see `lib/constants/breadcrumbs.constants.ts`/`nav.constants.ts` for the same "don't mirror the wireframe's mock-only domains" policy). */
export function DashboardOverview({ role }: DashboardOverviewProps) {
  const isSystemAdmin = role === 'SystemAdmin';
  const canViewReports = Boolean(role && PROJECT_MANAGEMENT_ROLES.includes(role));
  // A plain `User` (the backend's "Employee" role) only ever works their own
  // assigned projects, so the "Total Projects" stat card uses the same
  // `GET /Project/GetMyProjectList` (`useMyProjects`) the `/projects`
  // management table scopes to for that role (see `useProjectList`), instead
  // of the unscoped `GetProjectList` (`useProjects`) every other role sees
  // here.
  const isEmployee = role === 'User';

  const myProjectsQuery = useMyProjects(isEmployee);
  const allProjectsQuery = useProjects(!isEmployee);
  const {
    projects,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    error: projectsError,
    refetch: refetchProjects,
  } = isEmployee ? myProjectsQuery : allProjectsQuery;
  const {
    week,
    isLoading: isLoadingWeek,
    isError: isWeekError,
    error: weekError,
    refetch: refetchWeek,
  } = useTimesheetWeek(getMondayOfWeek());
  const {
    entries,
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useTimesheetHistory();

  const hasError = isProjectsError || isWeekError || isHistoryError;
  const errorMessage =
    projectsError ?? weekError ?? historyError ?? 'Could not load some of your dashboard data.';

  const hoursThisWeek = week ? week.entries.reduce((sum, entry) => sum + entry.hours, 0) : 0;
  const pendingCount = entries.filter((entry) => !entry.isApproved).length;
  const recentEntries = [...entries]
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
    .slice(0, 5);

  const handleRetry = () => {
    if (isProjectsError) refetchProjects();
    if (isWeekError) refetchWeek();
    if (isHistoryError) refetchHistory();
  };

  return (
    <div className="flex flex-col gap-6">
      {hasError && (
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Alert variant="error" className="flex-1">
            {errorMessage}
          </Alert>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Projects"
          value={isLoadingProjects ? '—' : String(projects.length)}
          caption="Active across all clients"
          icon={FolderKanban}
          iconClassName="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Hours This Week"
          value={isLoadingWeek ? '—' : `${hoursThisWeek}h`}
          caption="Logged across all projects"
          icon={Clock}
          iconClassName="bg-purple-100 text-purple-700"
        />
        <StatCard
          label="Pending Approval"
          value={isLoadingHistory ? '—' : String(pendingCount)}
          caption="Awaiting manager review"
          icon={ClipboardCheck}
          iconClassName="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Recent Timesheet Entries</h2>
            <Link href="/timesheets/history" className="text-sm font-medium text-brand hover:underline">
              View all &rarr;
            </Link>
          </div>
          {isLoadingHistory && (
            <p aria-live="polite" className="text-sm text-zinc-500">
              Loading…
            </p>
          )}
          {!isLoadingHistory && recentEntries.length === 0 && (
            <p className="text-sm text-zinc-500">No timesheet entries yet.</p>
          )}
          {!isLoadingHistory && recentEntries.length > 0 && (
            <ul className="divide-y divide-zinc-100">
              {recentEntries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{entry.projectName}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {entry.taskDescription || 'No task description provided.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-zinc-500">{formatEntryDate(entry.entryDate)}</span>
                    <span className="text-sm font-semibold text-zinc-900">{entry.hours}h</span>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        entry.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {entry.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/timesheets"
              className="flex flex-col items-center gap-2 rounded-md border border-zinc-200 p-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <Clock className="h-5 w-5 text-zinc-600" aria-hidden="true" />
              <span className="text-xs font-medium text-zinc-900">Log Time</span>
            </Link>
            {canViewReports && (
              <Link
                href="/reports"
                className="flex flex-col items-center gap-2 rounded-md border border-zinc-200 p-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                <BarChart3 className="h-5 w-5 text-zinc-600" aria-hidden="true" />
                <span className="text-xs font-medium text-zinc-900">View Reports</span>
              </Link>
            )}
            <Link
              href="/projects"
              className="flex flex-col items-center gap-2 rounded-md border border-zinc-200 p-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <FolderKanban className="h-5 w-5 text-zinc-600" aria-hidden="true" />
              <span className="text-xs font-medium text-zinc-900">Manage Projects</span>
            </Link>
            {isSystemAdmin && (
              <Link
                href="/admin/users/create"
                className="flex flex-col items-center gap-2 rounded-md border border-zinc-200 p-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                <UserPlus className="h-5 w-5 text-zinc-600" aria-hidden="true" />
                <span className="text-xs font-medium text-zinc-900">Create User</span>
              </Link>
            )}
            <Link
              href="/profile"
              className="flex flex-col items-center gap-2 rounded-md border border-zinc-200 p-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <UserIcon className="h-5 w-5 text-zinc-600" aria-hidden="true" />
              <span className="text-xs font-medium text-zinc-900">My Account</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
