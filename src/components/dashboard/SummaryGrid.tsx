"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import type {
  CompstatMetric,
  CompstatWindowId,
  OffenseDrilldownRow,
  DayOfWeekStat,
  HourOfDayStat,
  BreakdownRow,
  IncidentFeature,
} from "@/lib/types";
import { OffenseDrilldownModal } from "./OffenseDrilldownModal";
import { ZScoreModal } from "./ZScoreModal";
import {
  BreakdownInsightModal,
  DayOfWeekInsightModal,
  HotspotMapModal,
  HourlyInsightModal,
  IncidentSummaryModal,
  IncidentTableModal,
  NarrativeInsightModal,
} from "./WindowInsightModals";

interface SummaryGridProps {
  metrics: CompstatMetric[];
  isLoading: boolean;
  focusRange: CompstatWindowId;
  drilldown?: Partial<Record<CompstatWindowId, OffenseDrilldownRow[]>>;
  dayOfWeek: DayOfWeekStat[];
  hourOfDay: HourOfDayStat[];
  incidents: IncidentFeature[];
  focusNarrative?: string;
  topOffenses: BreakdownRow[];
  divisionLeaders: BreakdownRow[];
  incidentCategories: BreakdownRow[];
  incidentDivisions: BreakdownRow[];
  selectedOffenseCategory?: string;
  onSelectOffenseCategory?: (label: string) => void;
  onFocusRangeChange?: (range: CompstatWindowId) => void | Promise<void>;
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
  "28d": (
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
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <path d="M4 15h16" />
      <path d="M10 4v16" />
      <path d="M15 4v16" />
    </svg>
  ),
  ytd: (
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
      <path d="M4 18h16" />
      <path d="M8 18V7l4 3 3-5 3 6" />
      <path d="M4 6h4" />
    </svg>
  ),
  "365d": (
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
      <path d="M12 4a8 8 0 1 1-7.5 5" />
      <path d="M12 8v4l3 2" />
      <path d="M5 4h4v4" />
    </svg>
  ),
};

const WINDOW_NOTES: Record<CompstatWindowId, string> = {
  "7d":
    "Rolling 7-day total vs the immediately prior 7 days and the same dates one year ago.",
  "28d":
    "Rolling 28-day total with matching 28-day prior and year-ago comparisons.",
  ytd: "Year-to-date tally vs last year-to-date span and the previous YTD window.",
  "365d":
    "Trailing 365-day total contrasted with the prior 365 days and year-ago period.",
};

type InsightType =
  | "map"
  | "narrative"
  | "dayOfWeek"
  | "hourly"
  | "breakdown"
  | "incidentSummary"
  | "incidentTable"
  | "drilldown";

interface SummaryCardAction {
  id: InsightType;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
}

const INSIGHT_ICONS: Record<InsightType, ReactNode> = {
  map: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 6.5 9 4.5l6 2 5.5-2.5v13l-5.5 2.5-6-2-5.5 2.5v-13Z" />
      <path d="m9 4.5.03 13" />
      <path d="m15 6.5-.02 13" />
      <path d="M3.5 11 9 9l6 2 5.5-2.5" />
    </svg>
  ),
  narrative: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v3h3" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
      <path d="M8 18h4" />
    </svg>
  ),
  dayOfWeek: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 9h16" />
      <path d="M7 13h2" />
      <path d="M11 13h2" />
      <path d="M15 13h2" />
      <path d="M7 17h2" />
      <path d="M11 17h2" />
      <path d="M15 17h2" />
    </svg>
  ),
  hourly: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
      <path d="M12 4v2" />
      <path d="M12 18v2" />
      <path d="M4 12h2" />
      <path d="M18 12h2" />
    </svg>
  ),
  breakdown: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20v-6h4v6" />
      <path d="M10 20v-9h4v9" />
      <path d="M16 20V8h4v12" />
    </svg>
  ),
  incidentSummary: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h7" />
      <path d="M17 10v7l3-2" />
    </svg>
  ),
  incidentTable: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 11h16" />
      <path d="M10 5v14" />
    </svg>
  ),
  drilldown: (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h4v8H4z" />
      <path d="M10 10h4v10h-4z" />
      <path d="M16 4h4v12h-4z" />
      <path d="M12 18l2 2 2-2" />
    </svg>
  ),
};

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { then?: unknown }).then === "function";

const SummaryCard = ({
  metric,
  highlighted,
  onOpenZScore,
  actions,
  icon,
  windowNote,
  isCollapsed,
  onToggleCollapse,
}: {
  metric: CompstatMetric;
  highlighted: boolean;
  onOpenZScore?: (metric: CompstatMetric) => void;
  actions: SummaryCardAction[];
  icon?: ReactNode;
  windowNote?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) => {
  const delta = metric.changePct;
  const positive = delta >= 0;
  const deltaColor = positive ? "text-emerald-300" : "text-rose-300";
  const arrow = positive ? "↑" : "↓";

  const deltaYear = metric.changePctYearAgo;
  const yearPositive = deltaYear >= 0;
  const yearColor = yearPositive ? "text-sky-300" : "text-rose-300";
  const yearArrow = yearPositive ? "↑" : "↓";
  const hasActions = actions.length > 0;

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
        <div className="flex items-center justify-between gap-3">
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
          <button
            type="button"
            onClick={onToggleCollapse}
            className={clsx(
              "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] transition",
              isCollapsed
                ? "border-emerald-400/50 text-emerald-200 hover:border-emerald-300 hover:text-emerald-100"
                : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
            )}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
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
        {windowNote ? (
          <p className="mt-1 text-xs text-white/60">{windowNote}</p>
        ) : null}
        {hasActions ? (
          <div
            className={clsx(
              "mt-3 flex flex-col gap-3 overflow-hidden transition-all duration-300",
              isCollapsed ? "max-h-0 opacity-0" : "max-h-[520px] opacity-100",
            )}
            aria-hidden={isCollapsed}
          >
            {actions.length ? (
              <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="w-full rounded-full border border-white/15 bg-white/5 p-2 text-white/80 shadow-sm transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-40"
                    title={action.tooltip ?? action.label}
                  >
                    <span className="sr-only">{action.label}</span>
                    <div className="flex items-center justify-center">
                      {action.icon}
                    </div>
                  </button>
                ))}
              </div>
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
  incidents,
  focusNarrative,
  topOffenses,
  divisionLeaders,
  incidentCategories,
  incidentDivisions,
  selectedOffenseCategory,
  onSelectOffenseCategory,
  onFocusRangeChange,
}: SummaryGridProps) => {
  const [activeWindow, setActiveWindow] =
    useState<CompstatWindowId | null>(null);
  const [zDetailsMetric, setZDetailsMetric] =
    useState<CompstatMetric | null>(null);
  const [activeInsight, setActiveInsight] = useState<InsightType | null>(null);
  const [insightMetricLabel, setInsightMetricLabel] = useState<
    string | undefined
  >(undefined);
  const [focusSwitchTarget, setFocusSwitchTarget] =
    useState<CompstatWindowId | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<
    Record<CompstatWindowId, boolean>
  >({
    "7d": true,
    "28d": true,
    ytd: true,
    "365d": true,
  });

  const requestInsight = async (
    type: InsightType,
    metric: CompstatMetric,
  ) => {
    const requiresFocusSwitch =
      metric.id !== focusRange && Boolean(onFocusRangeChange);
    if (requiresFocusSwitch && onFocusRangeChange) {
      setFocusSwitchTarget(metric.id);
      try {
        const maybePromise = onFocusRangeChange(metric.id);
        if (isPromiseLike(maybePromise)) {
          await maybePromise;
        }
      } catch (error) {
        console.error("Unable to switch CompStat window for insight", error);
      } finally {
        setFocusSwitchTarget(null);
      }
    }
    setInsightMetricLabel(metric.label);
    setActiveInsight(type);
  };

  const closeInsight = () => {
    setActiveInsight(null);
    setInsightMetricLabel(undefined);
  };

  const ORDERED_WINDOWS: CompstatWindowId[] = [
    "7d",
    "28d",
    "ytd",
    "365d",
  ];
  const orderForWindow = (id: CompstatWindowId) => {
    const index = ORDERED_WINDOWS.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const sortedMetrics = [...metrics].sort(
    (a, b) => orderForWindow(a.id) - orderForWindow(b.id),
  );
  const insightAvailability: Record<InsightType, boolean> = {
    map: incidents.length > 0,
    narrative: Boolean(focusNarrative),
    dayOfWeek: (dayOfWeek?.length ?? 0) > 0,
    hourly: (hourOfDay?.length ?? 0) > 0,
    breakdown:
      (topOffenses?.length ?? 0) > 0 ||
      (divisionLeaders?.length ?? 0) > 0,
    incidentSummary:
      (incidentCategories?.length ?? 0) > 0 ||
      (incidentDivisions?.length ?? 0) > 0,
    incidentTable: incidents.length > 0,
    drilldown: true,
  };
  const defaultInsightLabel =
    metrics.find((entry) => entry.id === focusRange)?.label ??
    "Current focus window";
  const activeInsightLabel = insightMetricLabel ?? defaultInsightLabel;

  const buildInsightActions = (
    metric: CompstatMetric,
    options?: { onOpenDrilldown?: () => void; canOpenDrilldown?: boolean },
  ): SummaryCardAction[] => {
    const isSwitchingFocus = focusSwitchTarget === metric.id;
    const canOpenDrilldown = options?.canOpenDrilldown ?? false;
    const actions: SummaryCardAction[] = [
      {
        id: "map",
        label: "Open hot spot map",
        icon: INSIGHT_ICONS.map,
        onClick: () => {
          void requestInsight("map", metric);
        },
        disabled: isSwitchingFocus || !insightAvailability.map,
        tooltip: isSwitchingFocus
          ? "Switching focus window..."
          : insightAvailability.map
            ? "Expand the hot spot map"
            : "No mapped incidents in this window.",
      },
      {
        id: "narrative",
        label: "Read focus narrative",
        icon: INSIGHT_ICONS.narrative,
        onClick: () => {
          void requestInsight("narrative", metric);
        },
        disabled: isSwitchingFocus || !insightAvailability.narrative,
        tooltip: isSwitchingFocus
          ? "Switching focus window..."
          : insightAvailability.narrative
            ? "View the analyst narrative"
            : "Narrative unavailable for the current filters.",
      },
      {
        id: "dayOfWeek",
        label: "View day-of-week pattern",
        icon: INSIGHT_ICONS.dayOfWeek,
        onClick: () => {
          void requestInsight("dayOfWeek", metric);
        },
        disabled: isSwitchingFocus || !insightAvailability.dayOfWeek,
      },
      {
        id: "hourly",
        label: "View hourly cadence",
        icon: INSIGHT_ICONS.hourly,
        onClick: () => {
          void requestInsight("hourly", metric);
        },
        disabled: isSwitchingFocus || !insightAvailability.hourly,
      },
      {
        id: "breakdown",
        label: "View offense & division breakdowns",
        icon: INSIGHT_ICONS.breakdown,
        onClick: () => {
          void requestInsight("breakdown", metric);
        },
        disabled: isSwitchingFocus || !insightAvailability.breakdown,
      },
      {
        id: "incidentSummary",
        label: "View incident summary",
        icon: INSIGHT_ICONS.incidentSummary,
        onClick: () => {
          void requestInsight("incidentSummary", metric);
        },
        disabled:
          isSwitchingFocus || !insightAvailability.incidentSummary,
      },
      {
        id: "incidentTable",
        label: "View incident log",
        icon: INSIGHT_ICONS.incidentTable,
        onClick: () => {
          void requestInsight("incidentTable", metric);
        },
        disabled:
          isSwitchingFocus || !insightAvailability.incidentTable,
      },
    ];
    if (canOpenDrilldown && options?.onOpenDrilldown) {
      actions.push({
        id: "drilldown",
        label: "View Validation Table drilldown",
        icon: INSIGHT_ICONS.drilldown,
        onClick: options.onOpenDrilldown,
        disabled: isSwitchingFocus,
        tooltip: "Open the detailed offense drilldown",
      });
    }
    return actions;
  };

  const renderMetricCard = (metric: CompstatMetric) => {
    const hasDrilldown = Boolean(drilldown?.[metric.id]?.length);
    const isFocusMetric = metric.id === focusRange;
    const openDrilldownHandler = hasDrilldown
      ? () => setActiveWindow(metric.id)
      : undefined;
    const windowNote = WINDOW_NOTES[metric.id];
    return (
      <SummaryCard
        key={metric.id}
        metric={metric}
        highlighted={isFocusMetric}
        actions={buildInsightActions(metric, {
          onOpenDrilldown: openDrilldownHandler,
          canOpenDrilldown: hasDrilldown,
        })}
        onOpenZScore={(entry) => setZDetailsMetric(entry)}
        icon={RANGE_ICONS[metric.id]}
        windowNote={windowNote}
        isCollapsed={collapsedCards[metric.id]}
        onToggleCollapse={() =>
          setCollapsedCards((prev) => ({
            ...prev,
            [metric.id]: !prev[metric.id],
          }))
        }
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

  const allCollapsed = ORDERED_WINDOWS.every(
    (id) => collapsedCards[id],
  );
  const toggleAllCollapsed = (next: boolean) => {
    setCollapsedCards({
      "7d": next,
      "28d": next,
      ytd: next,
      "365d": next,
    });
  };
  const gridContent = (
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          Collapse or expand the insight controls for faster scanning.
        </p>
        <button
          type="button"
          onClick={() => toggleAllCollapsed(!allCollapsed)}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-emerald-300 hover:text-white"
          aria-pressed={allCollapsed}
        >
          {allCollapsed ? "Expand All Insights" : "Collapse All Insights"}
        </button>
      </div>
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
      {activeInsight === "map" ? (
        <HotspotMapModal
          incidents={incidents}
          metricLabel={activeInsightLabel}
          onClose={closeInsight}
        />
      ) : null}
      {activeInsight === "narrative" ? (
        <NarrativeInsightModal
          narrative={focusNarrative}
          metricLabel={activeInsightLabel}
          onClose={closeInsight}
        />
      ) : null}
      {activeInsight === "dayOfWeek" ? (
        <DayOfWeekInsightModal
          data={dayOfWeek}
          metricLabel={activeInsightLabel}
          onClose={closeInsight}
        />
      ) : null}
      {activeInsight === "hourly" ? (
        <HourlyInsightModal
          data={hourOfDay}
          metricLabel={activeInsightLabel}
          onClose={closeInsight}
        />
      ) : null}
      {activeInsight === "breakdown" ? (
        <BreakdownInsightModal
          offenses={topOffenses}
          divisions={divisionLeaders}
          metricLabel={activeInsightLabel}
          selectedOffense={selectedOffenseCategory}
          onSelectOffense={onSelectOffenseCategory}
          onClose={closeInsight}
        />
      ) : null}
      {activeInsight === "incidentSummary" ? (
        <IncidentSummaryModal
          categories={incidentCategories}
          divisions={incidentDivisions}
          metricLabel={activeInsightLabel}
          onClose={closeInsight}
        />
      ) : null}
      {activeInsight === "incidentTable" ? (
        <IncidentTableModal
          incidents={incidents}
          metricLabel={activeInsightLabel}
          onClose={closeInsight}
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
