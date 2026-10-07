import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShoppingCart } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { books } from '@/lib/mock-data';

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const book = books.find((item) => item.id === id) ?? books[0];

  return (
    <SiteShell>
      <div className="mb-8">
        <Link href="/books" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>
      </div>

      <div className="grid gap-8 rounded-3xl border border-white/10 bg-slate-900 p-6 md:grid-cols-[0.9fr_1.1fr]">
        <img src={book.cover} alt={book.title} className="h-full min-h-[420px] w-full rounded-3xl object-cover" />

        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">{book.category}</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">{book.title}</h1>
          <p className="mt-2 text-lg text-slate-300">by {book.author}</p>

          <div className="mt-6 flex items-center gap-6 text-sm text-slate-300">
            <span>{book.rating} ★ rating</span>
            <span>{book.stock} copies available</span>
            <span>{book.status}</span>
          </div>

          <p className="mt-6 text-base leading-7 text-slate-300">{book.description}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Purchase price</p>
              <p className="mt-2 text-2xl font-semibold text-white">₦{book.price.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Rental price</p>
              <p className="mt-2 text-2xl font-semibold text-white">₦{book.rentalPrice.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/cart" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-medium text-slate-950">
              <ShoppingCart className="h-4 w-4" />
              Add to cart
            </Link>
            <Link href="/subscription" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-white">
              <CheckCircle2 className="h-4 w-4" />
              Start rental
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
