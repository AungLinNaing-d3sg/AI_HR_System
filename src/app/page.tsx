import { redirect } from 'next/navigation';

/**
 * `/` has no content of its own - it always forwards to `/dashboard`, which
 * `proxy.ts` in turn bounces to `/login` for unauthenticated requests (see
 * its matcher config).
 */
export default function Home() {
  redirect('/dashboard');
}
