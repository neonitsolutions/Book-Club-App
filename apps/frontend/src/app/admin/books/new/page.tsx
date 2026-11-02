'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddBookForm } from '@/components/admin/add-book-form';
import { RequireAdmin } from '@/components/auth/require-auth';
import { SiteShell } from '@/components/site-shell';

export default function NewBookPage() {
  return (
    <SiteShell>
      <RequireAdmin>
        <div className="mx-auto max-w-4xl">
          <Link href="/admin/books" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to books
          </Link>
          <p className="mt-6 text-sm uppercase tracking-[0.2em] text-amber-300">Books</p>
          <h1 className="mb-8 mt-2 text-3xl font-semibold text-white">Add a book</h1>
          <AddBookForm />
        </div>
      </RequireAdmin>
    </SiteShell>
  );
}
