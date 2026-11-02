'use client';

import Link from 'next/link';
import { Library, LoaderCircle } from 'lucide-react';
import { useBooks } from '@/lib/catalog';
import { formatNaira } from '@/lib/money';
import { BookCard, BookCover, availabilityLabel } from './book-card';

/** The most recently added book, for the home page hero. */
export function FeaturedBook() {
  const { data } = useBooks({ limit: 4 });
  const book = data?.items[0];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span className="inline-flex items-center gap-2">
          <Library className="h-4 w-4 text-amber-300" />
          Newest arrival
        </span>
        {book && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">{availabilityLabel(book)}</span>}
      </div>

      {!data ? (
        <div className="flex h-72 items-center justify-center text-slate-500">
          <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading" />
        </div>
      ) : !book ? (
        <p className="flex h-72 items-center justify-center text-center text-slate-400">New books are on their way.</p>
      ) : (
        <Link href={`/books/${book.slug}`} className="group block">
          <BookCover book={book} className="mt-6 h-72 w-full rounded-2xl" />
          <h2 className="mt-5 text-2xl font-semibold text-white group-hover:text-amber-200">{book.title}</h2>
          <p className="mt-2 text-slate-300">{book.authors.join(', ')}</p>
          {book.saleEnabled && book.salePriceKobo !== undefined && (
            <p className="mt-3 text-sm text-amber-300">Buy {formatNaira(book.salePriceKobo)}</p>
          )}
        </Link>
      )}
    </div>
  );
}

export function NewestBooks() {
  const { data } = useBooks({ limit: 4 });
  if (!data?.items.length) return null;

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-semibold text-white">New in the club</h2>
        <Link href="/books" className="text-sm text-amber-300 hover:text-amber-200">
          View all &rarr;
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.items.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
