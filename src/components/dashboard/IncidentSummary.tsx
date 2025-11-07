import type { BreakdownRow } from "@/lib/types";

interface IncidentSummaryProps {
  categories: BreakdownRow[];
  divisions: BreakdownRow[];
  isLoading: boolean;
}

const SummaryList = ({
  title,
  items,
}: {
  title: string;
  items: BreakdownRow[];
}) => (
  <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-white/60">{title}</p>
    <ul className="mt-3 space-y-2 text-sm text-white/80">
      {items.length === 0 && (
        <li className="text-white/50">No data in this window.</li>
      )}
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between">
          <span className="text-white">{item.label}</span>
          <span className="font-semibold">{item.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const IncidentSummary = ({
  categories,
  divisions,
  isLoading,
}: IncidentSummaryProps) => {
  if (isLoading && !categories.length && !divisions.length) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-white shadow-lg shadow-slate-900/30">
      <header className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
        <div>
          <p className="font-semibold">Latest incidents overview</p>
          <p className="text-xs uppercase tracking-widest text-emerald-200">
            Current focus window
          </p>
        </div>
        <p className="text-xs text-white/50">Top groupings from the sampled incidents</p>
      </header>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SummaryList title="Offense mix" items={categories.slice(0, 5)} />
        <SummaryList title="Division load" items={divisions.slice(0, 5)} />
      </div>
    </section>
  );
};
