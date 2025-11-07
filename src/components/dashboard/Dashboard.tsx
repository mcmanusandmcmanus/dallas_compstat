"use client";



import { useCallback, useMemo, useState } from "react";

import useSWR from "swr";

import dynamic from "next/dynamic";

import type { CompstatResponse, CompstatWindowId } from "@/lib/types";

import { FilterBar } from "./FilterBar";

import { SummaryGrid } from "./SummaryGrid";

import { TrendCard } from "./TrendCard";

import { BreakdownList } from "./BreakdownList";

import { IncidentTable } from "./IncidentTable";

import { FocusNarrative } from "./FocusNarrative";

import { MethodologyCard } from "./MethodologyCard";

import { IncidentSummary } from "./IncidentSummary";

import { DayOfWeekChart } from "./DayOfWeekChart";

import { HourlyPatternChart } from "./HourlyPatternChart";



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

export const Dashboard = () => {
  const [filters, setFilters] = useState(BASE_FILTERS);
  const [mapExpanded, setMapExpanded] = useState(false);

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
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
          Dallas Police Department
        </p>
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

      <TrendCard
        data={data?.trend ?? []}
        isLoading={isLoading && !data}
      />

      <CrimeMap
        incidents={data?.incidents ?? []}
        isExpanded={mapExpanded}
        onToggleExpand={() => setMapExpanded((prev) => !prev)}
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

      <FocusNarrative
        narrative={data?.focusNarrative}
        isLoading={isLoading && !data}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DayOfWeekChart
          data={data?.dayOfWeek ?? []}
          isLoading={isLoading && !data}
        />
        <HourlyPatternChart
          data={data?.hourOfDay ?? []}
          isLoading={isLoading && !data}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownList
          title="Top offense categories"
          items={data?.topOffenses ?? []}
          isLoading={isLoading && !data}
          emptyLabel="No offenses recorded in this window."
          onSelectItem={handleCategoryDrilldown}
          selectedLabel={
            filters.offenseCategory !== "ALL"
              ? filters.offenseCategory
              : undefined
          }
        />
        <BreakdownList
          title="Divisions by volume"
          items={data?.divisionLeaders ?? []}
          isLoading={isLoading && !data}
          emptyLabel="No divisions to rank."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <IncidentSummary
          categories={data?.incidentCategories ?? []}
          divisions={data?.incidentDivisions ?? []}
          isLoading={isLoading && !data}
        />
        <IncidentTable
          incidents={data?.incidents ?? []}
          isLoading={isLoading && !data}
          maxRows={7}
        />
      </div>
    </section>
  );
};

export default Dashboard;
