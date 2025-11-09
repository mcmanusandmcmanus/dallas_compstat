"use client";

import clsx from "clsx";
import type { CompstatWindowId } from "@/lib/types";

const FOCUS_OPTIONS: Array<{
  id: CompstatWindowId;
  label: string;
  hint: string;
}> = [
  { id: "7d", label: "Last 7 days", hint: "Week pulse" },
  { id: "28d", label: "Last 28 days", hint: "Monthly cadence" },
  { id: "ytd", label: "Year to date", hint: "Progress vs last year" },
  { id: "365d", label: "Last 365 days", hint: "Rolling 12 months" },
];

interface FocusWindowSelectorProps {
  value: CompstatWindowId;
  onChange: (value: CompstatWindowId) => void;
  isBusy?: boolean;
}

export const FocusWindowSelector = ({
  value,
  onChange,
  isBusy = false,
}: FocusWindowSelectorProps) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-white shadow-lg shadow-slate-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
            Focus window
          </p>
          <p className="text-sm text-white/70">
            Choose the time horizon for the summary cards and insights.
          </p>
        </div>
        <p className="text-xs text-white/60">
          Comparisons include prior window and same dates one year ago.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FOCUS_OPTIONS.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isBusy && active}
              onClick={() => onChange(option.id)}
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
    </section>
  );
};

