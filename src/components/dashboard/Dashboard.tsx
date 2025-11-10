"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useSWR from "swr";

import dynamic from "next/dynamic";

import type { CompstatResponse, CompstatWindowId } from "@/lib/types";

import { FilterBar } from "./FilterBar";

import { SummaryGrid } from "./SummaryGrid";

import { TrendCard } from "./TrendCard";

import { MethodologyCard } from "./MethodologyCard";
import { CrimeCodeReferenceModal } from "./CrimeCodeReferenceModal";
import { ValidationTableModal } from "./ValidationTableModal";



const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to reach the CompStat API");
  }
  return (await response.json()) as CompstatResponse;
};

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 120_000,
  refreshInterval: 120_000,
  keepPreviousData: true,
};

const CrimeMap = dynamic(
  () => import("./CrimeMap").then((mod) => mod.CrimeMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    ),
  },
);

const withAllOption = (items: string[]) => [
  "ALL",
  ...items.filter((item) => item && item.trim().length > 0),
];

const BASE_FILTERS = {
  focusRange: "28d" as CompstatWindowId,
  division: "ALL",
  offenseCategory: "ALL",
};

const HERO_LINKS = [
  { href: "#about-data", label: "About the Data" },
  { href: "#crime-analysis", label: "Crime & Intelligence Analysis" },
  { href: "#executive-insights", label: "Executive Insights" },
  { href: "#data-science", label: "Data Science Lab" },
];

export const Dashboard = () => {
  const [filters, setFilters] = useState(BASE_FILTERS);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showValidationTable, setShowValidationTable] = useState(false);
  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const focusWaiters = useRef<Map<CompstatWindowId, Set<() => void>>>(
    new Map(),
  );

  const query = useMemo(() => {
    const params = new URLSearchParams({ focusRange: filters.focusRange });
    if (filters.division !== "ALL") {
      params.set("division", filters.division);
    }
    if (filters.offenseCategory !== "ALL") {
      params.set("offenseCategory", filters.offenseCategory);
    }
    return params.toString();
  }, [filters]);

  const { data, error, isLoading } = useSWR<CompstatResponse>(
    `/api/compstat?${query}`,
    fetcher,
    SWR_OPTIONS,
  );
  const dataFocusRange = data?.filters.focusRange;

  const availableDivisions = withAllOption(
    data?.filters.availableDivisions ?? [],
  );
  const availableCategories = withAllOption(
    data?.filters.availableCategories ?? [],
  );

  const updateFilters = useCallback(
    (patch: Partial<typeof BASE_FILTERS>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const resolveWaiters = useCallback(
    (range?: CompstatWindowId | null) => {
      if (!range) {
        return;
      }
      const waiters = focusWaiters.current.get(range);
      if (!waiters?.size) {
        return;
      }
      waiters.forEach((resolve) => resolve());
      focusWaiters.current.delete(range);
    },
    [],
  );

  useEffect(() => {
    resolveWaiters(dataFocusRange);
  }, [dataFocusRange, resolveWaiters]);

  useEffect(() => {
    if (!error) {
      return;
    }
    focusWaiters.current.forEach((waiters) => {
      waiters.forEach((resolve) => resolve());
    });
    focusWaiters.current.clear();
  }, [error]);

  useEffect(() => {
    const currentWaiters = focusWaiters.current;
    return () => {
      currentWaiters.forEach((waiters) => {
        waiters.forEach((resolve) => resolve());
      });
      currentWaiters.clear();
    };
  }, []);

  const awaitFocusRange = useCallback(
    (range: CompstatWindowId) =>
      new Promise<void>((resolve) => {
        const waiters = focusWaiters.current.get(range);
        if (waiters) {
          waiters.add(resolve);
        } else {
          focusWaiters.current.set(range, new Set([resolve]));
        }
      }),
    [],
  );

  const resetFilters = () => setFilters(BASE_FILTERS);

  const handleFocusChange = useCallback(
    (value: CompstatWindowId) => {
      if (value === filters.focusRange) {
        return Promise.resolve();
      }
      updateFilters({ focusRange: value });
      if (dataFocusRange === value) {
        return Promise.resolve();
      }
      return awaitFocusRange(value);
    },
    [awaitFocusRange, dataFocusRange, filters.focusRange, updateFilters],
  );

  const handleDivisionChange = (value: string) =>
    updateFilters({ division: value });

  const handleCategoryChange = (value: string) =>
    updateFilters({ offenseCategory: value });

  const handleCategoryDrilldown = (value: string) => {
    updateFilters({ offenseCategory: value });
  };

  if (error) {
    return (
      <section className="rounded-2xl border border-white/10 bg-rose-500/10 p-8 text-white shadow-xl shadow-rose-500/30">
        <h2 className="text-xl font-semibold">
          CompStat API is unavailable
        </h2>
        <p className="mt-2 text-sm text-white/80">
          {error.message}. Please retry in a moment.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            Dallas Police Department - Open Data API
          </p>
          <button
            type="button"
            onClick={() => setShowReference(true)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-emerald-100 shadow-emerald-500/30 transition hover:bg-emerald-500/20"
            title="View the Texas NIBRS crime-code reference"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M4 5.5C4 4.12 5.12 3 6.5 3H20v15.5c0 .83-.67 1.5-1.5 1.5H6.5C5.12 20 4 18.88 4 17.5V5.5Z" />
              <path d="M4 5h15c.55 0 1 .45 1 1v12" />
              <path d="M8 9h8" />
              <path d="M8 13h5" />
            </svg>
            TX CODES
          </button>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            CompStat Command Brief
          </h1>
          <nav
            className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70"
            aria-label="CompStat sections"
          >
            {HERO_LINKS.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 transition hover:border-emerald-400/50 hover:text-white"
              >
                <span className="rounded-full bg-white/10 px-2 py-1 font-mono text-[0.55rem] tracking-widest text-white/60 group-hover:text-emerald-200">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="text-[0.6rem]">{link.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowValidationTable(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-emerald-300 hover:text-white"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 9h10" />
              <path d="M7 13h6" />
              <path d="M7 17h4" />
            </svg>
            Validation table
          </button>
        </div>
      </header>

      <SummaryGrid
        metrics={data?.windows ?? []}
        isLoading={isLoading && !data}
        focusRange={filters.focusRange}
        drilldown={data?.drilldown}
        dayOfWeek={data?.dayOfWeek ?? []}
        hourOfDay={data?.hourOfDay ?? []}
        incidents={data?.incidents ?? []}
        focusNarrative={data?.focusNarrative}
        topOffenses={data?.topOffenses ?? []}
        divisionLeaders={data?.divisionLeaders ?? []}
        incidentCategories={data?.incidentCategories ?? []}
        incidentDivisions={data?.incidentDivisions ?? []}
        selectedOffenseCategory={
          filters.offenseCategory !== "ALL"
            ? filters.offenseCategory
            : undefined
        }
        onSelectOffenseCategory={handleCategoryDrilldown}
        onFocusRangeChange={handleFocusChange}
      />

      <TrendCard
        data={data?.trend ?? []}
        isLoading={isLoading && !data}
      />

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/80">
              Hot spot map panel
            </p>
            <p className="text-xs text-white/60">
              Collapse by default to prioritize the CompStat KPI cards.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMapPanelOpen((prev) => !prev)}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-emerald-300 hover:text-white"
          >
            {mapPanelOpen ? "Hide map panel" : "Show map panel"}
          </button>
        </div>
        {mapPanelOpen ? (
          <div className="mt-4">
            <CrimeMap
              incidents={data?.incidents ?? []}
              isExpanded={mapExpanded}
              onToggleExpand={() => setMapExpanded((prev) => !prev)}
              focusRange={filters.focusRange}
              onFocusRangeChange={handleFocusChange}
              className="h-full"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/70">
            Map hidden to keep the 7d / 28d / YTD / 365d cards in view. Use
            “Show map panel” whenever spatial context is needed.
          </div>
        )}
      </section>

      <FilterBar
        division={filters.division}
        offenseCategory={filters.offenseCategory}
        onDivisionChange={handleDivisionChange}
        onOffenseChange={handleCategoryChange}
        availableDivisions={availableDivisions}
        availableCategories={availableCategories}
        isBusy={isLoading && !data}
        onReset={resetFilters}
      />

      {data?.meta?.stale ? (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
          <p className="font-semibold text-amber-200">
            Live data temporarily unavailable
          </p>
          <p className="mt-1 text-amber-100/80">
            {data.meta.reason ??
              "Showing the last cached snapshot until Socrata is reachable again."}
          </p>
        </div>
      ) : null}

      <MethodologyCard
        generatedAt={data?.generatedAt}
        isStale={data?.meta?.stale}
      />

      {showReference ? (
        <CrimeCodeReferenceModal onClose={() => setShowReference(false)} />
      ) : null}
      {showValidationTable ? (
        <ValidationTableModal
          drilldown={data?.drilldown}
          onClose={() => setShowValidationTable(false)}
        />
      ) : null}
    </section>
  );
};

export default Dashboard;
