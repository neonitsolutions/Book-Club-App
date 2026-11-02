import Link from 'next/link';
import { BookOpenText, ShoppingCart, Sparkles } from 'lucide-react';
import { AccountMenu } from '@/components/auth/account-menu';
import { AdminLink, NavLinks } from '@/components/nav-links';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-wide text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <BookOpenText className="h-5 w-5" />
            </span>
            Readers Club
          </Link>

          <NavLinks />

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-amber-400 hover:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>

      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-slate-200">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Readers Club platform
          </div>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <AdminLink className="hover:text-white" />
          </div>
        </div>
      </footer>
    </div>
  );
}
