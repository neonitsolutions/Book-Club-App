import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { books } from '@/lib/mock-data';

export default function SalePage() {
  return (
    <SiteShell>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Bookstore</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Buy books for keeps</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => (
          <article key={book.id} className="rounded-3xl border border-white/10 bg-slate-900 p-4">
            <img src={book.cover} alt={book.title} className="h-60 w-full rounded-2xl object-cover" />
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>{book.category}</span>
                <span>{book.stock} in stock</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-white">{book.title}</h2>
              <p className="mt-1 text-sm text-slate-300">{book.author}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-amber-300">₦{book.price.toLocaleString()}</span>
                <Link href={`/books/${book.id}`} className="inline-flex items-center gap-2 text-sm text-white">
                  Buy now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
