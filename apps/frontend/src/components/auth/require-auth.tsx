'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { Role, useSession } from '@/lib/auth';

/**
 * Sends guests to /login, and shows signed-in users without one of `roles` a
 * "not allowed" message. This only hides pages; the backend still checks the
 * session and role on every request.
 */
export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (!user) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-amber-300" />
        <h1 className="mt-4 text-xl font-semibold text-white">This page is for administrators</h1>
        <p className="mt-2 text-sm text-slate-300">Your account does not have access to it.</p>
        <Link href="/books" className="mt-6 inline-block text-sm text-amber-300 hover:text-amber-200">
          Browse books &rarr;
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

/** Admin-only pages. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return <RequireAuth roles={['ADMIN']}>{children}</RequireAuth>;
}
