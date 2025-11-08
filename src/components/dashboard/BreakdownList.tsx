"use client";

import type { ReactNode } from "react";
import type { BreakdownRow } from "@/lib/types";

interface BreakdownListProps {
  title: string;
  items: BreakdownRow[];
  isLoading: boolean;
  emptyLabel: string;
  onSelectItem?: (label: string) => void;
  selectedLabel?: string;
  icon?: ReactNode;
  iconLabel?: string;
}

export const BreakdownList = ({
  title,
  items,
  isLoading,
  emptyLabel,
  onSelectItem,
  selectedLabel,
  icon,
  iconLabel,
}: BreakdownListProps) => {
  if (isLoading && items.length === 0) {
    return (
      <div className="h-[260px] animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30">
      <header className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
        <div className="flex items-center gap-3">
          {icon ? (
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-emerald-200 shadow-inner shadow-emerald-500/20"
              aria-hidden={iconLabel ? undefined : true}
              role={iconLabel ? "img" : undefined}
              aria-label={iconLabel}
            >
              {icon}
            </span>
          ) : null}
          <div className="flex flex-col">
            <p className="font-semibold">{title}</p>
            <span className="text-xs uppercase tracking-widest text-emerald-200">
              Current focus window
            </span>
          </div>
        </div>
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

          const isSelected =
            selectedLabel &&
            item.label.toLowerCase() === selectedLabel.toLowerCase();
          const clickable = Boolean(onSelectItem);

          return (
            <div key={item.label}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelectItem?.(item.label)}
                className={`flex w-full items-center justify-between rounded-xl px-2 py-1 text-left text-sm transition ${
                  clickable
                    ? "hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
                    : ""
                } ${isSelected ? "bg-white/5 text-emerald-200" : "text-white/80"}`}
              >
                <span className="font-medium">{item.label}</span>
                <span className="font-semibold text-white">
                  {item.count.toLocaleString()}
                </span>
              </button>
              <div className="mt-2 flex h-2 items-center gap-2">
                <div className="h-full w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200"
                    style={{ width }}
                  />
                </div>
                <span
                  className={`text-xs font-semibold ${deltaClass}`}
                  title="Percent change relative to the immediately preceding window."
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
