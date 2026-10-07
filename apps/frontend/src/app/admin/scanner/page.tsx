import { SiteShell } from '@/components/site-shell';

export default function ScannerPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-slate-900 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Staff scanner</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Book scanner</h1>
          </div>
          <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Scan QR</button>
        </div>

        <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-amber-400/60 bg-slate-950 text-center text-slate-400">
            Camera preview
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950 p-5">
            <div className="text-lg font-medium text-white">Atomic Habits</div>
            <div className="text-sm text-slate-300">Copy: RBC-000023</div>
            <div className="text-sm text-slate-300">Status: RENTED</div>
            <div className="text-sm text-slate-300">Member: John Doe</div>
            <div className="text-sm text-slate-300">Due date: 15 Oct 2026</div>
            <div className="text-sm text-slate-300">Condition: GOOD</div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-950">Confirm return</button>
              <button className="rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950">Report damage</button>
              <button className="rounded-full bg-rose-500 px-4 py-2 font-medium text-white">Mark lost</button>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
