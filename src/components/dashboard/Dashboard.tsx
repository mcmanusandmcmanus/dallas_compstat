"use client";



import { useCallback, useMemo, useState } from "react";

import useSWR from "swr";

import type { CompstatResponse, CompstatWindowId } from "@/lib/types";

import { FilterBar } from "./FilterBar";

import { SummaryGrid } from "./SummaryGrid";

import { TrendCard } from "./TrendCard";

import { MethodologyCard } from "./MethodologyCard";
import { CrimeCodeReferenceModal } from "./CrimeCodeReferenceModal";



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

const withAllOption = (items: string[]) => [
  "ALL",
  ...items.filter((item) => item && item.trim().length > 0),
];

const BASE_FILTERS = {
  focusRange: "28d" as CompstatWindowId,
  division: "ALL",
  offenseCategory: "ALL",
};

export const Dashboard = () => {
  const [filters, setFilters] = useState(BASE_FILTERS);
  const [showReference, setShowReference] = useState(false);

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

  const resetFilters = () => setFilters(BASE_FILTERS);

  const handleFocusChange = (value: CompstatWindowId) =>
    updateFilters({ focusRange: value });

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
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          CompStat Command Brief
        </h1>
        <p className="text-base text-white/70 md:text-lg">
          Real-time NIBRS offenses, spatial hot spots, and Poisson significance bands built directly on the City of Dallas open
          dataset. Adjust the division, offense mix, or time horizon to generate a meeting-ready brief in seconds.
        </p>
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

      <FilterBar
        focusRange={filters.focusRange}
        onFocusRangeChange={handleFocusChange}
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
    </section>
  );
};

export default Dashboard;
