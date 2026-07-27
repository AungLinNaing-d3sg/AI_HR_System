import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CountriesTable } from '@/components/tables/CountriesTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Countries',
};

/**
 * `proxy.ts` already redirects non-SystemAdmin/unauthenticated requests away
 * from this route (`SYSTEM_ADMIN_ONLY_ROUTES`), but per the Next.js Proxy
 * docs a matcher change could silently remove that coverage - so this Server
 * Component independently re-checks the role from the access-token cookie
 * before rendering, mirroring `admin/currencies/page.tsx`. The
 * `/api/countries` Route Handlers behind `CountriesTable` perform the same
 * check again for mutations, and the backend is the final authority.
 */
export default async function AdminCountriesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/admin/countries');
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <CountriesTable />
    </div>
  );
}
