"use client";

import clsx from "clsx";
import type { CompstatWindowId } from "@/lib/types";

const focusOptions: Array<{
  id: CompstatWindowId;
  label: string;
  hint: string;
}> = [
  { id: "7d", label: "7 day pulse", hint: "week vs prior week" },
  { id: "28d", label: "28 day view", hint: "monthly cadence" },
  { id: "ytd", label: "Year to date", hint: "progress vs last year" },
  { id: "365d", label: "Rolling 12 months", hint: "long-term trend" },
];

interface FilterBarProps {
  focusRange: CompstatWindowId;
  onFocusRangeChange: (value: CompstatWindowId) => void;
  division: string;
  offenseCategory: string;
  onDivisionChange: (value: string) => void;
  onOffenseChange: (value: string) => void;
  availableDivisions: string[];
  availableCategories: string[];
  isBusy: boolean;
  onReset: () => void;
}

export const FilterBar = ({
  focusRange,
  onFocusRangeChange,
  division,
  offenseCategory,
  onDivisionChange,
  onOffenseChange,
  availableDivisions,
  availableCategories,
  isBusy,
  onReset,
}: FilterBarProps) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-white shadow-xl shadow-slate-900/20">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Focus window
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {focusOptions.map((option) => {
              const active = option.id === focusRange;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={active && isBusy}
                  onClick={() => onFocusRangeChange(option.id)}
                  className={clsx(
                    "rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300",
                    active
                      ? "border-emerald-300 bg-white text-slate-900 shadow-lg"
                      : "border-white/15 bg-white/0 text-white/80 hover:border-white/40 hover:bg-white/5",
                  )}
                >
                  <p className="text-base font-semibold">{option.label}</p>
                  <p className="text-sm text-white/60">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm text-white/70">
            Division
            <select
              value={division}
              onChange={(event) => onDivisionChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/30 px-3 py-2 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              disabled={isBusy && !availableDivisions.length}
            >
              {availableDivisions.map((value) => (
                <option key={value} value={value}>
                  {value === "ALL" ? "All divisions" : value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-white/70">
            Offense category
            <select
              value={offenseCategory}
              onChange={(event) => onOffenseChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/30 px-3 py-2 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              disabled={isBusy && !availableCategories.length}
            >
              {availableCategories.map((value) => (
                <option key={value} value={value}>
                  {value === "ALL" ? "All categories" : value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-emerald-200 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20"
          >
            Reset filters
          </button>
        </div>
      </div>
    </section>
  );
};
