"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type {
  CompstatMetric,
  CompstatWindowId,
  OffenseDrilldownRow,
} from "@/lib/types";
import { OffenseDrilldownModal } from "./OffenseDrilldownModal";

interface SummaryGridProps {
  metrics: CompstatMetric[];
  isLoading: boolean;
  focusRange: CompstatWindowId;
  drilldown?: Partial<Record<CompstatWindowId, OffenseDrilldownRow[]>>;
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
  onOpenDrilldown,
}: {
  metric: CompstatMetric;
  highlighted: boolean;
  onOpenDrilldown?: () => void;
}) => {
  const delta = metric.changePct;
  const positive = delta >= 0;
  const deltaColor = positive ? "text-emerald-300" : "text-rose-300";
  const arrow = positive ? "↑" : "↓";

  const deltaYear = metric.changePctYearAgo;
  const yearPositive = deltaYear >= 0;
  const yearColor = yearPositive ? "text-sky-300" : "text-rose-300";
  const yearArrow = yearPositive ? "↑" : "↓";

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
        <div className="flex items-center gap-2">
          {onOpenDrilldown ? (
            <button
              type="button"
              onClick={onOpenDrilldown}
              className="rounded-full border border-white/20 p-1 text-white/60 transition hover:border-white/60 hover:text-white"
              title="View offense drilldown"
            >
              <span className="sr-only">
                Open {metric.label} drilldown
              </span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M4 11h16M10 5v14" />
              </svg>
            </button>
          ) : null}
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-semibold",
              badgeStyles[metric.classification],
            )}
          >
            {metric.classification}
          </span>
        </div>
      </div>

      <p className="mt-4 text-4xl font-semibold leading-tight text-white">
        {metric.current.toLocaleString()}
      </p>
      <p className="text-sm text-white/60">
        prev {metric.previous.toLocaleString()}
      </p>

      <div className="mt-6 flex items-center justify-between text-sm text-white/70">
        <div className="flex flex-col gap-1 text-xs">
          <span
            className={clsx("font-semibold", deltaColor)}
            title="Percent change compared to the immediately preceding window."
          >
            {arrow} {Math.abs(delta).toFixed(1)}% vs prior period
          </span>
          <span
            className={clsx("font-semibold", yearColor)}
            title="Percent change compared to the same dates one year ago."
          >
            {yearArrow} {Math.abs(deltaYear).toFixed(1)}% vs same time last year
          </span>
        </div>
        <span className="text-xs font-semibold text-white/80">
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
  drilldown,
}: SummaryGridProps) => {
  const [activeWindow, setActiveWindow] =
    useState<CompstatWindowId | null>(null);

  useEffect(() => {
    if (
      activeWindow &&
      (!drilldown?.[activeWindow] ||
        drilldown[activeWindow]?.length === 0)
    ) {
      setActiveWindow(null);
    }
  }, [activeWindow, drilldown]);

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
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const hasDrilldown = Boolean(
            drilldown?.[metric.id]?.length,
          );
          return (
            <SummaryCard
              key={metric.id}
              metric={metric}
              highlighted={metric.id === focusRange}
              onOpenDrilldown={
                hasDrilldown
                  ? () => setActiveWindow(metric.id)
                  : undefined
              }
            />
          );
        })}
      </div>
      {activeWindow && drilldown?.[activeWindow]?.length ? (
        <OffenseDrilldownModal
          rows={drilldown[activeWindow]!}
          title={
            metrics.find((metric) => metric.id === activeWindow)
              ?.label ?? "Selected window"
          }
          onClose={() => setActiveWindow(null)}
        />
      ) : null}
    </>
  );
};
