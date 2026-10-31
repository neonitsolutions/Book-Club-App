import { RequireAuth } from '@/components/auth/require-auth';
import { SiteShell } from '@/components/site-shell';
import { dashboardMetrics, inventoryItems } from '@/lib/mock-data';

export default function DashboardPage() {
  return (
    <SiteShell>
      <RequireAuth>
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Member area</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {dashboardMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-400">{metric.label}</div>
              <div className="mt-3 text-2xl font-semibold text-white">{metric.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Current rentals</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Copy</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Due date</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((item) => (
                  <tr key={item.copy} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white">{item.copy}</td>
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3">{item.member}</td>
                    <td className="px-4 py-3">{item.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </RequireAuth>
    </SiteShell>
  );
}
