import { Suspense } from 'react';
import { VerifyEmail } from '@/components/auth/verify-email';
import { SiteShell } from '@/components/site-shell';

export default function VerifyEmailPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Account activation</p>
        {/* Reads the token from the URL, which is only known in the browser */}
        <Suspense>
          <VerifyEmail />
        </Suspense>
      </div>
    </SiteShell>
  );
}
