import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { books } from '@/lib/mock-data';

export default function CartPage() {
  const selectedBooks = books.slice(0, 2);
  const subtotal = selectedBooks.reduce((acc, item) => acc + item.price, 0);

  return (
    <SiteShell>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Cart</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Your order</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.7fr]">
        <div className="space-y-4">
          {selectedBooks.map((book) => (
            <div key={book.id} className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900 p-4">
              <img src={book.cover} alt={book.title} className="h-28 w-20 rounded-2xl object-cover" />
              <div className="flex flex-1 items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{book.title}</h2>
                  <p className="text-sm text-slate-300">{book.author}</p>
                  <p className="mt-2 text-sm text-amber-300">₦{book.price.toLocaleString()}</p>
                </div>
                <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">Remove</button>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Summary</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>₦1,500</span></div>
            <div className="flex justify-between"><span>Service fee</span><span>₦800</span></div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-lg font-semibold text-white flex items-center justify-between">
            <span>Total</span>
            <span>₦{(subtotal + 1500 + 800).toLocaleString()}</span>
          </div>
          <Link href="/register" className="mt-6 inline-flex w-full justify-center rounded-full bg-amber-500 px-4 py-3 font-medium text-slate-950">Checkout</Link>
        </aside>
      </div>
    </SiteShell>
  );
}
