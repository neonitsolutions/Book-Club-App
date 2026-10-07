import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { books } from '@/lib/mock-data';

export default function AdminBooksPage() {
  return (
    <SiteShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Books</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Manage catalog</h1>
        </div>
        <button className="rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950">Add book</button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">{book.title}</td>
                <td className="px-4 py-3">{book.author}</td>
                <td className="px-4 py-3">{book.status}</td>
                <td className="px-4 py-3">₦{book.price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link href={`/books/${book.id}`} className="text-amber-300">View</Link>
                    <button className="text-slate-300">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SiteShell>
  );
}
