'use client';

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { authErrorMessage, resendVerification } from '@/lib/auth';

/** "Send a new activation link" for an email address. */
export function ResendLink({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'sent') {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-300">
        <MailCheck className="h-4 w-4" />
        If {email} has an account waiting for activation, a new link is on its way.
      </p>
    );
  }

  return (
    <p className="text-sm text-slate-400">
      No email?{' '}
      <button
        type="button"
        disabled={state === 'sending'}
        onClick={async () => {
          setState('sending');
          try {
            await resendVerification(email);
            setState('sent');
          } catch (err) {
            setError(authErrorMessage(err));
            setState('error');
          }
        }}
        className="text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Send a new link'}
      </button>
      {state === 'error' && <span className="ml-2 text-rose-300">{error}</span>}
    </p>
  );
}
