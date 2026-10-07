import { SiteShell } from '@/components/site-shell';
import { inventoryItems } from '@/lib/mock-data';

export default function AdminInventoryPage() {
  return (
    <SiteShell>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Inventory</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Book copy tracking</h1>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-4 py-3">Inventory code</th>
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
    </SiteShell>
  );
}
