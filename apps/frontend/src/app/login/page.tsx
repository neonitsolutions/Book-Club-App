import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { SiteShell } from '@/components/site-shell';

export default function LoginPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Sign in</h1>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link href="/register" className="text-amber-300">Create an account</Link>
        </p>
      </div>
    </SiteShell>
  );
}
