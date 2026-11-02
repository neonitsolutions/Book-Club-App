import Link from 'next/link';
import { ArrowRight, BookOpenText, Library, Sparkles, TrendingUp } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { FeaturedBook, NewestBooks } from '@/components/catalog/newest-books';

export default function HomePage() {
  return (
    <SiteShell>
      <section className="grid gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Digital reading club
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-bold tracking-tight text-white md:text-6xl">
            Read more. Rent smarter. Grow your library.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Readers Club helps members borrow, buy, and manage physical books with subscriptions,
            QR-based inventory tracking, and staff workflows built for a modern library experience.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/books"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-amber-400"
            >
              Explore catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-medium text-white transition hover:border-white/30"
            >
              Join today
            </Link>
          </div>
        </div>

        <FeaturedBook />
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { icon: BookOpenText, title: 'Catalog browsing', text: 'Browse the public catalog with flexible rental and purchase options.' },
          { icon: TrendingUp, title: 'Smart subscriptions', text: 'Offer multiple plans based on rental limits, days, and renewal windows.' },
          { icon: Library, title: 'QR inventory', text: 'Track each physical copy, status, and scan-based staff verification.' },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="mb-4 inline-flex rounded-2xl bg-amber-500/10 p-3 text-amber-300">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-slate-300">{item.text}</p>
          </div>
        ))}
      </section>

      <NewestBooks />
    </SiteShell>
  );
}
