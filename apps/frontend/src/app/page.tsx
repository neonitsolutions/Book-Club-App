import Link from 'next/link';
import { ArrowRight, BadgeCheck, BookOpenText, Library, Sparkles, TrendingUp } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { books, dashboardMetrics } from '@/lib/mock-data';

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

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {dashboardMetrics.slice(0, 3).map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">{metric.value}</div>
                <div className="mt-1 text-sm text-slate-300">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Library className="h-4 w-4 text-amber-300" />
              Featured today
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">Live stock</span>
          </div>

          <img
            src={books[0].cover}
            alt={books[0].title}
            className="mt-6 h-72 w-full rounded-2xl object-cover"
          />
          <div className="mt-5">
            <h2 className="text-2xl font-semibold text-white">{books[0].title}</h2>
            <p className="mt-2 text-slate-300">{books[0].author}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-amber-300">Rental ₦{books[0].rentalPrice.toLocaleString()}</span>
              <span className="text-slate-300">{books[0].stock} copies</span>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-emerald-300">
              <BadgeCheck className="h-4 w-4" />
              Ready for checkout in 2 minutes
            </div>
          </div>
        </div>
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

      <section className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-semibold text-white">Popular books</h2>
          <Link href="/books" className="text-sm text-amber-300 hover:text-amber-200">
            View all &rarr;
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 transition hover:-translate-y-1 hover:border-amber-400/40">
              <img src={book.cover} alt={book.title} className="h-64 w-full object-cover" />
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>{book.category}</span>
                  <span>{book.status}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{book.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{book.author}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-amber-300">₦{book.price.toLocaleString()}</span>
                  <span className="text-sm text-slate-400">{book.rating} ★</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
