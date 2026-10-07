import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { books } from '@/lib/mock-data';

export default function BooksPage() {
  return (
    <SiteShell>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Browse all titles</h1>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-slate-300">
          <Search className="h-4 w-4" />
          <input
            aria-label="Search books"
            className="w-52 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Search books"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {books.map((book) => (
          <article key={book.id} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
            <img src={book.cover} alt={book.title} className="h-64 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>{book.category}</span>
                <span>{book.stock} left</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{book.title}</h2>
              <p className="mt-1 text-sm text-slate-300">{book.author}</p>
              <p className="mt-3 text-sm text-slate-400">{book.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-amber-300">₦{book.price.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Rental ₦{book.rentalPrice.toLocaleString()}/month</div>
                </div>
                <Link href={`/books/${book.id}`} className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950">
                  View
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
