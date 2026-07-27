import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Building2 } from 'lucide-react';
import { LoginForm } from '@/components/forms/LoginForm';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Sign in',
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken && !isTokenExpired(decodeAccessToken(accessToken))) {
    redirect('/dashboard');
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-sidebar px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Building2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-white">HR Timesheet</h1>
          <p className="text-sm text-sidebar-foreground-muted">Invoice &amp; Time Management System</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-lg font-semibold text-zinc-900">Sign in to your account</h2>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
