import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

export default function RegisterPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Begin your journey</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Create account</h1>

        <form className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Full name</label>
            <input type="text" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input type="email" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input type="password" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="Create a password" />
          </div>
          <button type="submit" className="w-full rounded-full bg-amber-500 px-4 py-3 font-medium text-slate-950">Create account</button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-300">Sign in</Link>
        </p>
      </div>
    </SiteShell>
  );
}
