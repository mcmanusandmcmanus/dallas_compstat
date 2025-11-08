"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import type {
  CompstatMetric,
  CompstatWindowId,
  OffenseDrilldownRow,
  DayOfWeekStat,
  HourOfDayStat,
} from "@/lib/types";
import { OffenseDrilldownModal } from "./OffenseDrilldownModal";
import { PatternInsightsModal } from "./PatternInsightsModal";
import { ZScoreModal } from "./ZScoreModal";

interface SummaryGridProps {
  metrics: CompstatMetric[];
  isLoading: boolean;
  focusRange: CompstatWindowId;
  drilldown?: Partial<Record<CompstatWindowId, OffenseDrilldownRow[]>>;
  dayOfWeek: DayOfWeekStat[];
  hourOfDay: HourOfDayStat[];
  onOpenMap?: () => void;
  mapSlot?: ReactNode;
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

const RANGE_ICONS: Partial<Record<CompstatWindowId, ReactNode>> = {
  "7d": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 9h16" />
      <path d="M10 13h4" />
    </svg>
  ),
};

const SummaryCard = ({
  metric,
  highlighted,
  onOpenDrilldown,
  onOpenPatterns,
  onOpenMap,
  onOpenZScore,
  icon,
}: {
  metric: CompstatMetric;
  highlighted: boolean;
  onOpenDrilldown?: () => void;
  onOpenPatterns?: () => void;
  onOpenMap?: () => void;
  onOpenZScore?: (metric: CompstatMetric) => void;
  icon?: ReactNode;
}) => {
  const delta = metric.changePct;
  const positive = delta >= 0;
  const deltaColor = positive ? "text-emerald-300" : "text-rose-300";
  const arrow = positive ? "↑" : "↓";

  const deltaYear = metric.changePctYearAgo;
  const yearPositive = deltaYear >= 0;
  const yearColor = yearPositive ? "text-sky-300" : "text-rose-300";
  const yearArrow = yearPositive ? "↑" : "↓";
  const hasActions = Boolean(
    onOpenPatterns || onOpenDrilldown || onOpenMap,
  );

  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 p-5 transition hover:border-white/30",
        highlighted
          ? "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent shadow-xl shadow-emerald-500/30"
          : "bg-slate-900/40",
      )}
    >
      <div className="text-sm text-white/70">
        <div className="flex items-center gap-3">
          {icon ? (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-emerald-200 shadow-inner shadow-emerald-500/20"
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <p className="font-medium">{metric.label}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <span
            className={clsx(
              "inline-flex w-fit rounded-full px-3 py-1 font-semibold",
              badgeStyles[metric.classification],
            )}
          >
            {metric.classification}
          </span>
          <button
            type="button"
            onClick={() => onOpenZScore?.(metric)}
            className="font-semibold text-white/80 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
            title="Show the z-score calculation details"
          >
            z = {metric.zScore.toFixed(1)}
          </button>
        </div>
        {hasActions ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onOpenMap ? (
              <button
                type="button"
                onClick={onOpenMap}
                className="group rounded-full border border-white/20 bg-white/5 p-1.5 text-white/80 shadow-sm transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                title="Expand hot spot map"
              >
                <span className="sr-only">Expand the map view</span>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_4px_rgba(148,163,184,0.45)]"
                >
                  <path d="M3.5 6.5 9 4.5l6 2 5.5-2.5v13l-5.5 2.5-6-2-5.5 2.5v-13Z" />
                  <path d="m9 4.5.03 13" />
                  <path d="m15 6.5-.02 13" />
                  <path d="M3.5 11 9 9l6 2 5.5-2.5" />
                </svg>
              </button>
            ) : null}
            {onOpenPatterns ? (
              <button
                type="button"
                onClick={onOpenPatterns}
                className="group rounded-full border border-emerald-400/40 bg-emerald-500/10 p-2 text-emerald-100 transition hover:bg-emerald-500/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                title="View day-of-week and hourly cadence"
              >
                <span className="sr-only">
                  View temporal patterns for {metric.label}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]"
                >
                  <path d="M4 17.5h16" />
                  <path d="M6 6.5v11" />
                  <path d="M10 8c1.2 2.6 2.8 2.6 4 0 1.2-2.7 2.8-2.7 4 0" />
                  <circle cx="10" cy="8" r="1.1" fill="currentColor" stroke="none" />
                  <circle cx="14" cy="8" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </button>
            ) : null}
            {onOpenDrilldown ? (
              <button
                type="button"
                onClick={onOpenDrilldown}
                className="group rounded-full border border-sky-400/40 bg-sky-500/10 p-2 text-sky-100 transition hover:bg-sky-500/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
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
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_4px_rgba(125,211,252,0.45)]"
                >
                  <path d="M4 6h4v8H4z" />
                  <path d="M10 10h4v10h-4z" />
                  <path d="M16 4h4v12h-4z" />
                  <path d="M12 18l2 2 2-2" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-4xl font-semibold leading-tight text-white">
        {metric.current.toLocaleString()}
      </p>
      <p className="text-sm text-white/60">
        prev {metric.previous.toLocaleString()}
      </p>

      <div className="mt-6 text-sm text-white/70">
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
      </div>
    </div>
  );
};

export const SummaryGrid = ({
  metrics,
  isLoading,
  focusRange,
  drilldown,
  dayOfWeek,
  hourOfDay,
  onOpenMap,
  mapSlot,
}: SummaryGridProps) => {
  const [activeWindow, setActiveWindow] =
    useState<CompstatWindowId | null>(null);
  const [patternSnapshot, setPatternSnapshot] = useState<{
    dayOfWeek: DayOfWeekStat[];
    hourOfDay: HourOfDayStat[];
  } | null>(null);
  const [zDetailsMetric, setZDetailsMetric] =
    useState<CompstatMetric | null>(null);
  const hasPatternData =
    (dayOfWeek?.length ?? 0) > 0 || (hourOfDay?.length ?? 0) > 0;
  const handleOpenPatterns = () => {
    if (!hasPatternData) {
      return;
    }
    setPatternSnapshot({
      dayOfWeek,
      hourOfDay,
    });
  };

  const ORDERED_WINDOWS: CompstatWindowId[] = [
    "7d",
    "28d",
    "ytd",
    "365d",
  ];
  const LEFT_COLUMN_WINDOWS: CompstatWindowId[] = ["7d", "28d"];
  const RIGHT_COLUMN_WINDOWS: CompstatWindowId[] = ["ytd", "365d"];

  const orderForWindow = (id: CompstatWindowId) => {
    const index = ORDERED_WINDOWS.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const sortedMetrics = [...metrics].sort(
    (a, b) => orderForWindow(a.id) - orderForWindow(b.id),
  );
  const leftColumnMetrics = sortedMetrics.filter((metric) =>
    LEFT_COLUMN_WINDOWS.includes(metric.id),
  );
  const rightColumnMetrics = sortedMetrics.filter((metric) =>
    RIGHT_COLUMN_WINDOWS.includes(metric.id),
  );

  const renderMetricCard = (metric: CompstatMetric) => {
    const hasDrilldown = Boolean(drilldown?.[metric.id]?.length);
    const enablePatterns =
      metric.id === "7d" && hasPatternData;
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
        onOpenPatterns={
          enablePatterns ? handleOpenPatterns : undefined
        }
        onOpenMap={onOpenMap}
        onOpenZScore={(entry) => setZDetailsMetric(entry)}
        icon={RANGE_ICONS[metric.id]}
      />
    );
  };

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

  const hasMapSlot = Boolean(mapSlot);
  const gridContent = hasMapSlot ? (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)_minmax(0,0.85fr)]">
      <div className="order-1 grid gap-4 lg:order-none">
        {leftColumnMetrics.map((metric) => renderMetricCard(metric))}
      </div>
      <div className="order-2 flex h-full lg:order-none">{mapSlot}</div>
      <div className="order-3 grid gap-4 lg:order-none">
        {rightColumnMetrics.map((metric) => renderMetricCard(metric))}
      </div>
    </div>
  ) : (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {sortedMetrics.map((metric) => renderMetricCard(metric))}
    </div>
  );

  const validActiveWindow =
    activeWindow && drilldown?.[activeWindow]?.length
      ? activeWindow
      : null;
  const drilldownRows = validActiveWindow
    ? drilldown?.[validActiveWindow]
    : undefined;

  return (
    <>
      {gridContent}
      {validActiveWindow && drilldownRows?.length ? (
        <OffenseDrilldownModal
          rows={drilldownRows}
          title={
            metrics.find((metric) => metric.id === validActiveWindow)
              ?.label ?? "Selected window"
          }
          onClose={() => setActiveWindow(null)}
        />
      ) : null}
      {patternSnapshot ? (
        <PatternInsightsModal
          dayOfWeek={patternSnapshot.dayOfWeek}
          hourOfDay={patternSnapshot.hourOfDay}
          onClose={() => setPatternSnapshot(null)}
        />
      ) : null}
      {zDetailsMetric ? (
        <ZScoreModal
          metric={zDetailsMetric}
          onClose={() => setZDetailsMetric(null)}
        />
      ) : null}
    </>
  );
};
