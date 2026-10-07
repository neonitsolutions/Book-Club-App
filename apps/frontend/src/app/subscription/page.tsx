import Link from 'next/link';
import { Check } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { plans } from '@/lib/mock-data';

export default function SubscriptionPage() {
  return (
    <SiteShell>
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Membership</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">Choose a reading plan</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="text-sm uppercase tracking-[0.2em] text-amber-300">{plan.name}</div>
            <div className="mt-6 flex items-end gap-2">
              <span className="text-4xl font-semibold text-white">₦{plan.price.toLocaleString()}</span>
              <span className="pb-1 text-slate-400">/{plan.days} days</span>
            </div>
            <p className="mt-3 text-slate-300">{plan.description}</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> {plan.books} book rentals</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Access to club catalog</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Renewal reminders</li>
            </ul>

            <Link href="/register" className="mt-8 inline-flex w-full justify-center rounded-full bg-amber-500 px-4 py-3 font-medium text-slate-950">
              Select plan
            </Link>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
