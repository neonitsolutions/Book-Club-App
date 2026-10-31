import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { SiteShell } from '@/components/site-shell';

export default function RegisterPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Begin your journey</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Create account</h1>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-300">Sign in</Link>
        </p>
      </div>
    </SiteShell>
  );
}
