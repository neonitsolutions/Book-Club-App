import { BookCatalog } from '@/components/catalog/book-catalog';
import { SiteShell } from '@/components/site-shell';

export default function BooksPage() {
  return (
    <SiteShell>
      <BookCatalog eyebrow="Catalog" title="All books for rent and for sale" />
    </SiteShell>
  );
}
