import { BookCatalog } from '@/components/catalog/book-catalog';
import { SiteShell } from '@/components/site-shell';

export default function RentPage() {
  return (
    <SiteShell>
      <BookCatalog purpose="rent" eyebrow="Rental library" title="Books available to rent" />
    </SiteShell>
  );
}
