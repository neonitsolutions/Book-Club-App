import { Suspense } from 'react';
import { BookDetail } from '@/components/catalog/book-detail';
import { SiteShell } from '@/components/site-shell';

export default function BookDetailPage() {
  return (
    <SiteShell>
      {/* The book id comes from the URL, which is only known per request */}
      <Suspense>
        <BookDetail />
      </Suspense>
    </SiteShell>
  );
}
