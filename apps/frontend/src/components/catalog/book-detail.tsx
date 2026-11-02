'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle, ShoppingCart } from 'lucide-react';
import { useSession } from '@/lib/auth';
import { Book, useBook } from '@/lib/catalog';
import { formatNaira } from '@/lib/money';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: book, isPending, isError, refetch } = useBook(id);

  return (
    <>
      <div className="mb-8">
        <Link href="/books" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>
      </div>

      {isPending ? (
        <div className="flex justify-center py-24 text-slate-400">
          <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading book" />
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center text-rose-200">
          This book could not be loaded.{' '}
          <button type="button" onClick={() => refetch()} className="underline hover:text-white">
            Try again
          </button>
        </div>
      ) : !book ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
          <h1 className="text-2xl font-semibold text-white">Book not found</h1>
          <p className="mt-2 text-slate-300">It may have been removed from the catalog.</p>
        </div>
      ) : (
        <BookView book={book} />
      )}
    </>
  );
}

function BookView({ book }: { book: Book }) {
  const { user } = useSession();
  const facts = [
    book.publisher && ['Publisher', book.publisher],
    book.publicationYear && ['Published', String(book.publicationYear)],
    book.pageCount && ['Pages', String(book.pageCount)],
    ['Language', book.language],
    book.isbn && ['ISBN', book.isbn],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="grid gap-8 rounded-3xl border border-white/10 bg-slate-900 p-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Gallery book={book} />

      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">
          {book.categories.map((c) => c.name).join(' · ') || 'Book'}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{book.title}</h1>
        {book.subtitle && <p className="mt-2 text-xl text-slate-300">{book.subtitle}</p>}
        <p className="mt-2 text-lg text-slate-300">by {book.authors.join(', ')}</p>

        {book.description && (
          <p className="mt-6 whitespace-pre-line text-base leading-7 text-slate-300">{book.description}</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {book.rentalEnabled && (
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Rent</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {book.rentalPriceKobo > 0 ? formatNaira(book.rentalPriceKobo) : 'With membership'}
              </p>
              <p className="mt-1 text-sm text-emerald-300">
                {book.availability.rentalAvailable > 0
                  ? `${book.availability.rentalAvailable} of ${book.availability.rentalTotal} copies available`
                  : 'All copies are out right now'}
              </p>
            </div>
          )}
          {book.saleEnabled && book.salePriceKobo !== undefined && (
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Buy</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNaira(book.salePriceKobo)}</p>
              <p className="mt-1 text-sm text-amber-300">
                {book.availability.saleAvailable > 0 ? `${book.availability.saleAvailable} in stock` : 'Sold out'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          {book.saleEnabled && book.availability.saleAvailable > 0 && (
            <Link
              href={user ? '/cart' : '/register'}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-medium text-slate-950 hover:bg-amber-400"
            >
              <ShoppingCart className="h-4 w-4" />
              {user ? 'Add to cart' : 'Sign up to buy'}
            </Link>
          )}
          {book.rentalEnabled && book.availability.rentalAvailable > 0 && (
            <Link
              href={user ? '/subscription' : '/register'}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-white hover:border-white/30"
            >
              <CheckCircle2 className="h-4 w-4" />
              {user ? 'Rent with a membership' : 'Sign up to rent'}
            </Link>
          )}
        </div>

        {facts.length > 0 && (
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-400">{label}</dt>
                <dd className="mt-1 text-white">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/** The cover and every other picture of the book, with thumbnails to switch between them. */
function Gallery({ book }: { book: Book }) {
  const pictures = book.images.length ? book.images : book.coverUrl ? [{ url: book.coverUrl }] : [];
  const [index, setIndex] = useState(0);

  if (!pictures.length) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-slate-800 text-slate-500" aria-hidden>
        <BookOpenText className="h-16 w-16" />
      </div>
    );
  }

  const current = pictures[Math.min(index, pictures.length - 1)];
  const go = (step: number) => setIndex((index + step + pictures.length) % pictures.length);

  return (
    <div>
      <figure className="relative">
        <img
          src={current.url}
          alt={current.caption ?? book.title}
          className="h-[420px] w-full rounded-3xl bg-slate-950 object-contain sm:h-[520px]"
        />
        {pictures.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous picture"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next picture"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        {current.caption && <figcaption className="mt-3 text-center text-sm text-slate-400">{current.caption}</figcaption>}
      </figure>

      {pictures.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {pictures.map((picture, i) => (
            <button
              key={picture.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show picture ${i + 1}`}
              aria-current={i === index}
              className={`shrink-0 overflow-hidden rounded-xl border-2 ${
                i === index ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={picture.url} alt="" className="h-20 w-16 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
