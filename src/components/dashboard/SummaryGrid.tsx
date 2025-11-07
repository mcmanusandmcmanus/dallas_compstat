"use client";

import clsx from "clsx";
import type {
  CompstatMetric,
  CompstatWindowId,
} from "@/lib/types";

interface SummaryGridProps {
  metrics: CompstatMetric[];
  isLoading: boolean;
  focusRange: CompstatWindowId;
}

const badgeStyles: Record<CompstatMetric["classification"], string> = {
  Spike: "bg-rose-500/15 text-rose-200 border border-rose-300/30",
  Elevated:
    "bg-amber-400/10 text-amber-200 border border-amber-200/30",
  Normal:
    "bg-emerald-400/10 text-emerald-200 border border-emerald-200/30",
  "Below Normal":
    "bg-sky-400/10 text-sky-200 border border-sky-200/30",
};

const SummaryCard = ({
  metric,
  highlighted,
}: {
  metric: CompstatMetric;
  highlighted: boolean;
}) => {
  const delta = metric.changePct;
  const positive = delta >= 0;
  const deltaColor = positive ? "text-emerald-300" : "text-rose-300";
  const arrow = positive ? "▲" : "▼";

  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 p-5 transition hover:border-white/30",
        highlighted
          ? "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent shadow-xl shadow-emerald-500/30"
          : "bg-slate-900/40",
      )}
    >
      <div className="flex items-center justify-between text-sm text-white/70">
        <p className="font-medium">{metric.label}</p>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-semibold",
            badgeStyles[metric.classification],
          )}
        >
          {metric.classification}
        </span>
      </div>

      <p className="mt-4 text-4xl font-semibold leading-tight text-white">
        {metric.current.toLocaleString()}
      </p>
      <p className="text-sm text-white/60">
        prev {metric.previous.toLocaleString()}
      </p>

      <div className="mt-6 flex items-center justify-between text-sm text-white/70">
        <span className={clsx("font-semibold", deltaColor)}>
          {arrow} {Math.abs(delta).toFixed(1)}%
        </span>
        <span className="text-xs">
          z = {metric.zScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

export const SummaryGrid = ({
  metrics,
  isLoading,
  focusRange,
}: SummaryGridProps) => {
  if (isLoading && metrics.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`summary-skeleton-${index}`}
            className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <SummaryCard
          key={metric.id}
          metric={metric}
          highlighted={metric.id === focusRange}
        />
      ))}
    </div>
  );
};

