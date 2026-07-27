import Link from 'next/link';

export const metadata = {
  title: 'Access denied',
};

export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Access denied</h1>
      <p className="max-w-md text-zinc-600">
        You don&apos;t have permission to view this page. If you believe this is a mistake, contact
        your System Admin.
      </p>
      <Link href="/dashboard" className="font-medium text-zinc-900 underline underline-offset-4">
        Back to your dashboard
      </Link>
    </main>
  );
}
