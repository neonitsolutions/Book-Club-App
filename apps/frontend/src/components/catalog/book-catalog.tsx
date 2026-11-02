'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { Purpose, useBooks } from '@/lib/catalog';
import { BookCard } from './book-card';

const PAGE_SIZE = 24;

const TABS: { purpose?: Purpose; label: string; href: string }[] = [
  { label: 'All books', href: '/books' },
  { purpose: 'rent', label: 'For rent', href: '/books/rent' },
  { purpose: 'sale', label: 'For sale', href: '/books/sale' },
];

const EMPTY: Record<string, string> = {
  all: 'No books in the catalog yet.',
  rent: 'No books available to rent yet.',
  sale: 'No books for sale yet.',
};

/** The public catalog: everyone, signed in or not, can browse it. */
export function BookCatalog({ purpose, eyebrow, title }: { purpose?: Purpose; eyebrow: string; title: string }) {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Search once typing pauses, not on every key
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(input);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isPending, isError, isFetching, refetch } = useBooks({ purpose, q, page, limit: PAGE_SIZE });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
        </div>
        <label className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-slate-300 focus-within:border-amber-400">
          <Search className="h-4 w-4" />
          <input
            type="search"
            aria-label="Search books"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Search title or author"
          />
          {isFetching && !isPending && <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Searching" />}
        </label>
      </div>

      <div className="mb-8 flex gap-2 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.purpose === purpose ? 'page' : undefined}
            className={`rounded-full px-4 py-2 transition ${
              tab.purpose === purpose
                ? 'bg-amber-500 font-medium text-slate-950'
                : 'border border-white/10 text-slate-300 hover:border-amber-400 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {isPending ? (
        <div className="flex justify-center py-24 text-slate-400">
          <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading books" />
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center text-rose-200">
          The books could not be loaded.{' '}
          <button type="button" onClick={() => refetch()} className="underline hover:text-white">
            Try again
          </button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-300">
          {q ? `No books match “${q}”.` : EMPTY[purpose ?? 'all']}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-400">
            {data.total} {data.total === 1 ? 'book' : 'books'}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          {pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4 text-sm text-slate-300">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-full border border-white/10 px-4 py-2 hover:border-amber-400 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="rounded-full border border-white/10 px-4 py-2 hover:border-amber-400 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
