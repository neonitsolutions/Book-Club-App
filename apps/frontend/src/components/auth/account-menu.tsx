'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle2 } from 'lucide-react';
import { useAuthActions, useSession } from '@/lib/auth';

/** Header button: "Sign in" for guests, the member's name and "Sign out" otherwise. */
export function AccountMenu() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { logout } = useAuthActions();

  if (isLoading) {
    return <span className="h-9 w-24 animate-pulse rounded-full bg-white/5" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400"
      >
        <UserCircle2 className="h-4 w-4" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-amber-400 hover:text-white"
      >
        <UserCircle2 className="h-4 w-4 text-amber-300" />
        <span className="max-w-32 truncate">{user.name.split(' ')[0]}</span>
      </Link>
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push('/');
        }}
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-slate-400 transition hover:text-white"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
