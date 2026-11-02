'use client';

import Link from 'next/link';
import { LoaderCircle, Plus } from 'lucide-react';
import { RequireAdmin } from '@/components/auth/require-auth';
import { SiteShell } from '@/components/site-shell';
import { useBooks } from '@/lib/catalog';
import { formatNaira } from '@/lib/money';

export default function AdminBooksPage() {
  return (
    <SiteShell>
      <RequireAdmin>
        <AdminBooks />
      </RequireAdmin>
    </SiteShell>
  );
}

function AdminBooks() {
  const { data, isPending, isError } = useBooks({ limit: 60 });

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Books</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Manage catalog</h1>
        </div>
        <Link
          href="/admin/books/new"
          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Add book
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900">
        {isPending ? (
          <div className="flex justify-center py-16 text-slate-400">
            <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading books" />
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-rose-200">The books could not be loaded.</p>
        ) : data.items.length === 0 ? (
          <p className="p-12 text-center text-slate-300">
            No books yet.{' '}
            <Link href="/admin/books/new" className="text-amber-300 hover:text-amber-200">
              Add the first one
            </Link>
          </p>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Rental copies</th>
                <th className="px-4 py-3">Sale copies</th>
                <th className="px-4 py-3">Sale price</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((book) => (
                <tr key={book.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white">{book.title}</td>
                  <td className="px-4 py-3">{book.authors.join(', ')}</td>
                  <td className="px-4 py-3">
                    {book.rentalEnabled
                      ? `${book.availability.rentalAvailable} of ${book.availability.rentalTotal} in`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{book.saleEnabled ? `${book.availability.saleAvailable} in stock` : '—'}</td>
                  <td className="px-4 py-3">
                    {book.saleEnabled && book.salePriceKobo !== undefined ? formatNaira(book.salePriceKobo) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/books/${book.slug}`} className="text-amber-300 hover:text-amber-200">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
