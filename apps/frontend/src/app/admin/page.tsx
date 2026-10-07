import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { dashboardMetrics, inventoryItems } from '@/lib/mock-data';

export default function AdminPage() {
  return (
    <SiteShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Admin dashboard</h1>
        </div>
        <Link href="/admin/books" className="rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950">Manage books</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {dashboardMetrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">{metric.label}</div>
            <div className="mt-3 text-2xl font-semibold text-white">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Management shortcuts</h2>
          <div className="mt-5 grid gap-3 text-sm text-slate-300">
            <Link href="/admin/books" className="rounded-2xl border border-white/10 bg-slate-950 p-3 hover:border-amber-300">Books</Link>
            <Link href="/admin/inventory" className="rounded-2xl border border-white/10 bg-slate-950 p-3 hover:border-amber-300">Inventory</Link>
            <Link href="/admin/scanner" className="rounded-2xl border border-white/10 bg-slate-950 p-3 hover:border-amber-300">Scanner</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Inventory status</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            {inventoryItems.map((item) => (
              <div key={item.copy} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 p-3">
                <div>
                  <div className="font-medium text-white">{item.copy}</div>
                  <div>{item.title}</div>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
