'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth';

const LINKS = [
  { href: '/books', label: 'Books' },
  { href: '/books/rent', label: 'Rent' },
  { href: '/books/sale', label: 'Sale' },
  { href: '/subscription', label: 'Membership' },
];

/** Header links. Dashboard needs an account; Admin is only shown to admins. */
export function NavLinks() {
  const { user } = useSession();

  return (
    <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="transition hover:text-white">
          {link.label}
        </Link>
      ))}
      {user && (
        <Link href="/dashboard" className="transition hover:text-white">
          Dashboard
        </Link>
      )}
      <AdminLink />
    </nav>
  );
}

export function AdminLink({ className = 'transition hover:text-white' }: { className?: string }) {
  const { user } = useSession();
  if (user?.role !== 'ADMIN') return null;
  return (
    <Link href="/admin" className={className}>
      Admin
    </Link>
  );
}
