import { BookCatalog } from '@/components/catalog/book-catalog';
import { SiteShell } from '@/components/site-shell';

export default function SalePage() {
  return (
    <SiteShell>
      <BookCatalog purpose="sale" eyebrow="Bookstore" title="Books for sale" />
    </SiteShell>
  );
}
