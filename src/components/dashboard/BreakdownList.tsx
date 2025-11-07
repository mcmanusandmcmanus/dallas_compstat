'use client';

import type { BreakdownRow } from "@/lib/types";

interface BreakdownListProps {
  title: string;
  items: BreakdownRow[];
  isLoading: boolean;
  emptyLabel: string;
}

export const BreakdownList = ({
  title,
  items,
  isLoading,
  emptyLabel,
}: BreakdownListProps) => {
  if (isLoading && items.length === 0) {
    return (
      <div className="h-[260px] animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30">
      <header className="flex items-center justify-between text-sm text-white/70">
        <p className="font-semibold">{title}</p>
        <p className="text-white/50">Top {items.length}</p>
      </header>
      <div className="mt-4 space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-white/60">{emptyLabel}</p>
        )}
        {items.map((item) => {
          const width = `${Math.max(
            8,
            Math.round((item.count / maxCount) * 100),
          )}%`;
          const delta = item.changePct;
          const deltaClass =
            delta >= 0 ? "text-emerald-300" : "text-rose-300";

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm text-white/80">
                <p className="font-medium">{item.label}</p>
                <p className="font-semibold">
                  {item.count.toLocaleString()}
                </p>
              </div>
              <div className="mt-2 flex h-2 items-center gap-2">
                <div className="h-full w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200"
                    style={{ width }}
                  />
                </div>
                <span
                  className={`text-xs font-semibold ${deltaClass}`}
                >
                  {delta >= 0 ? "+" : "-"}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
