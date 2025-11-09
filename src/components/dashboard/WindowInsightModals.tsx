"use client";

import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";

import type {
  BreakdownRow,
  DayOfWeekStat,
  HourOfDayStat,
  IncidentFeature,
} from "@/lib/types";
import { DayOfWeekChart } from "./DayOfWeekChart";
import { HourlyPatternChart } from "./HourlyPatternChart";
import { BreakdownList } from "./BreakdownList";
import { IncidentSummary } from "./IncidentSummary";
import { IncidentTable } from "./IncidentTable";

const CrimeMap = dynamic(
  () => import("./CrimeMap").then((mod) => mod.CrimeMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    ),
  },
);

const formatSubtitle = (label?: string) =>
  label ? `${label} | Current focus window` : "Current focus window";

interface ModalShellProps {
  title: string;
  subtitle?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

const ModalShell = ({
  title,
  subtitle = "Current focus window",
  description,
  onClose,
  children,
}: ModalShellProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-slate-900/70"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
              {subtitle}
            </p>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-white/70">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white hover:text-white"
          >
            Close
          </button>
        </header>
        <div className="max-h-[74vh] overflow-y-auto px-6 pb-6">{children}</div>
        <footer className="border-t border-white/10 px-6 py-3 text-xs text-white/60">
          Source: Dallas Police Department RMS incidents (&ldquo;qv6i-rri7&rdquo;).
        </footer>
      </div>
    </div>
  );
};

interface WithMetricLabel {
  metricLabel?: string;
}

interface MapModalProps extends WithMetricLabel {
  incidents: IncidentFeature[];
  onClose: () => void;
}

export const HotspotMapModal = ({
  incidents,
  metricLabel,
  onClose,
}: MapModalProps) => (
  <ModalShell
    title="Hot spot map"
    subtitle={formatSubtitle(metricLabel)}
    description="Leaflet heat-style view of the sampled incidents in this CompStat window."
    onClose={onClose}
  >
    <CrimeMap incidents={incidents} isExpanded className="h-[520px]" />
  </ModalShell>
);

interface NarrativeModalProps extends WithMetricLabel {
  narrative?: string;
  onClose: () => void;
}

export const NarrativeInsightModal = ({
  narrative,
  metricLabel,
  onClose,
}: NarrativeModalProps) => (
  <ModalShell
    title="Analyst focus narrative"
    subtitle={formatSubtitle(metricLabel)}
    description="Auto-generated briefing paragraph summarizing the statistically significant movement."
    onClose={onClose}
  >
    <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-base leading-relaxed text-white/80 shadow-lg shadow-slate-900/30">
      {narrative ?? "No narrative is available for this window yet."}
    </article>
  </ModalShell>
);

interface DayOfWeekModalProps extends WithMetricLabel {
  data: DayOfWeekStat[];
  onClose: () => void;
}

export const DayOfWeekInsightModal = ({
  data,
  metricLabel,
  onClose,
}: DayOfWeekModalProps) => (
  <ModalShell
    title="Day-of-week pattern"
    subtitle={formatSubtitle(metricLabel)}
    description="Seven-day breakdown of incident totals."
    onClose={onClose}
  >
    <DayOfWeekChart data={data} isLoading={false} />
  </ModalShell>
);

interface HourlyInsightModalProps extends WithMetricLabel {
  data: HourOfDayStat[];
  onClose: () => void;
}

export const HourlyInsightModal = ({
  data,
  metricLabel,
  onClose,
}: HourlyInsightModalProps) => (
  <ModalShell
    title="Hourly cadence"
    subtitle={formatSubtitle(metricLabel)}
    description="Distribution of incidents by hour of day."
    onClose={onClose}
  >
    <HourlyPatternChart data={data} isLoading={false} />
  </ModalShell>
);

interface BreakdownInsightModalProps extends WithMetricLabel {
  offenses: BreakdownRow[];
  divisions: BreakdownRow[];
  onClose: () => void;
  onSelectOffense?: (label: string) => void;
  selectedOffense?: string;
}

export const BreakdownInsightModal = ({
  offenses,
  divisions,
  metricLabel,
  onClose,
  onSelectOffense,
  selectedOffense,
}: BreakdownInsightModalProps) => (
  <ModalShell
    title="Top breakdowns"
    subtitle={formatSubtitle(metricLabel)}
    description="Rankings by offense mix and patrol division."
    onClose={onClose}
  >
    <div className="grid gap-6 lg:grid-cols-2">
      <BreakdownList
        title="Top offense categories"
        items={offenses}
        isLoading={false}
        emptyLabel="No offenses recorded in this window."
        onSelectItem={onSelectOffense}
        selectedLabel={selectedOffense}
      />
      <BreakdownList
        title="Divisions by volume"
        items={divisions}
        isLoading={false}
        emptyLabel="No divisions to rank."
      />
    </div>
  </ModalShell>
);

interface IncidentSummaryModalProps extends WithMetricLabel {
  categories: BreakdownRow[];
  divisions: BreakdownRow[];
  onClose: () => void;
}

export const IncidentSummaryModal = ({
  categories,
  divisions,
  metricLabel,
  onClose,
}: IncidentSummaryModalProps) => (
  <ModalShell
    title="Incident summary"
    subtitle={formatSubtitle(metricLabel)}
    description="Quick snapshot of the sampled incidents across the top categories and divisions."
    onClose={onClose}
  >
    <IncidentSummary
      categories={categories}
      divisions={divisions}
      isLoading={false}
    />
  </ModalShell>
);

interface IncidentTableModalProps extends WithMetricLabel {
  incidents: IncidentFeature[];
  onClose: () => void;
}

export const IncidentTableModal = ({
  incidents,
  metricLabel,
  onClose,
}: IncidentTableModalProps) => (
  <ModalShell
    title="Latest incident log"
    subtitle={formatSubtitle(metricLabel)}
    description="Live feed of the most recent mapped incidents."
    onClose={onClose}
  >
    <IncidentTable incidents={incidents} isLoading={false} maxRows={40} />
  </ModalShell>
);
