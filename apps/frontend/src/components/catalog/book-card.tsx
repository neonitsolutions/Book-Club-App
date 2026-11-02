import Link from 'next/link';
import { BookOpenText } from 'lucide-react';
import type { Book } from '@/lib/catalog';
import { formatNaira } from '@/lib/money';

/** The book's cover, or a plain placeholder when it has no pictures yet. */
export function BookCover({ book, className }: { book: Pick<Book, 'title' | 'coverUrl'>; className: string }) {
  if (!book.coverUrl) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 text-slate-500 ${className}`} aria-hidden>
        <BookOpenText className="h-10 w-10" />
      </div>
    );
  }
  return <img src={book.coverUrl} alt={book.title} className={`object-cover ${className}`} loading="lazy" />;
}

/** "3 to rent", "2 for sale", or "Out of stock". */
export function availabilityLabel(book: Book): string {
  const parts: string[] = [];
  if (book.rentalEnabled && book.availability.rentalAvailable > 0) {
    parts.push(`${book.availability.rentalAvailable} to rent`);
  }
  if (book.saleEnabled && book.availability.saleAvailable > 0) {
    parts.push(`${book.availability.saleAvailable} for sale`);
  }
  return parts.length ? parts.join(' · ') : 'Out of stock';
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 transition hover:-translate-y-1 hover:border-amber-400/40"
    >
      <BookCover book={book} className="h-64 w-full" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="truncate">{book.categories[0]?.name ?? 'Book'}</span>
          <span className="shrink-0">{availabilityLabel(book)}</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-white group-hover:text-amber-200">{book.title}</h2>
        <p className="mt-1 text-sm text-slate-300">{book.authors.join(', ')}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs">
          {book.rentalEnabled && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
              {book.rentalPriceKobo > 0 ? `Rent ${formatNaira(book.rentalPriceKobo)}` : 'Rent with membership'}
            </span>
          )}
          {book.saleEnabled && book.salePriceKobo !== undefined && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300">
              Buy {formatNaira(book.salePriceKobo)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
