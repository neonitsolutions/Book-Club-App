'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuthActions } from '@/lib/auth';

type State = { status: 'working' } | { status: 'done' } | { status: 'failed'; message: string };

/** Opened from the activation email: uses the link's token, then signs the member in. */
export function VerifyEmail() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const { verifyEmail } = useAuthActions();
  const [state, setState] = useState<State>(
    token ? { status: 'working' } : { status: 'failed', message: 'This activation link is incomplete.' },
  );

  // The token works once; React runs effects twice in development
  const sent = useRef(false);
  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verifyEmail(token)
      .then(() => {
        setState({ status: 'done' });
        setTimeout(() => router.replace('/books'), 1500);
      })
      .catch((error: unknown) => {
        const expired = error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 410);
        setState({
          status: 'failed',
          message: expired
            ? 'This activation link has expired or was already used.'
            : 'Your account could not be activated. Please try again.',
        });
      });
  }, [token, verifyEmail, router]);

  if (state.status === 'working') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-slate-300">
        <LoaderCircle className="h-7 w-7 animate-spin text-amber-300" />
        Activating your account…
      </div>
    );
  }

  if (state.status === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
        <CircleCheck className="h-8 w-8 text-emerald-300" />
        <h2 className="text-xl font-semibold text-white">Your account is active</h2>
        <p className="text-slate-300">You are signed in. Taking you to the books…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" role="alert">
      <CircleAlert className="h-8 w-8 text-rose-300" />
      <p className="text-slate-200">{state.message}</p>
      <p className="text-sm text-slate-400">
        If your account is already active, just{' '}
        <Link href="/login" className="text-amber-300 hover:text-amber-200">
          sign in
        </Link>
        . Otherwise, sign in to get a new link.
      </p>
    </div>
  );
}
