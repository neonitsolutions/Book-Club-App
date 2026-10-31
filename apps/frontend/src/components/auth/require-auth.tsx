'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useSession } from '@/lib/auth';

/**
 * Sends guests to /login. This only hides pages; the backend still checks the
 * session on every request for member data.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
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
  return <>{children}</>;
}
