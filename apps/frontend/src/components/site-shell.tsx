import Link from 'next/link';
import { BookOpenText, ShoppingCart, Sparkles, UserCircle2 } from 'lucide-react';

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

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="/books" className="transition hover:text-white">Books</Link>
            <Link href="/books/rent" className="transition hover:text-white">Rent</Link>
            <Link href="/books/sale" className="transition hover:text-white">Sale</Link>
            <Link href="/subscription" className="transition hover:text-white">Membership</Link>
            <Link href="/dashboard" className="transition hover:text-white">Dashboard</Link>
            <Link href="/admin" className="transition hover:text-white">Admin</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-amber-400 hover:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400">
              <UserCircle2 className="h-4 w-4" />
              Sign in
            </Link>
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
            <Link href="/admin" className="hover:text-white">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
