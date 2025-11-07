"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import type {
  CompstatResponse,
  CompstatWindowId,
} from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { SummaryGrid } from "./SummaryGrid";
import { TrendCard } from "./TrendCard";
import { BreakdownList } from "./BreakdownList";
import { IncidentTable } from "./IncidentTable";
import { FocusNarrative } from "./FocusNarrative";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to reach the CompStat API");
  }
  return (await response.json()) as CompstatResponse;
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

export const Dashboard = () => {
  const [focusRange, setFocusRange] =
    useState<CompstatWindowId>("28d");
  const [division, setDivision] = useState("ALL");
  const [category, setCategory] = useState("ALL");

  const query = useMemo(() => {
    const params = new URLSearchParams({ focusRange });
    if (division !== "ALL") {
      params.set("division", division);
    }
    if (category !== "ALL") {
      params.set("offenseCategory", category);
    }
    return params.toString();
  }, [focusRange, division, category]);

  const { data, error, isLoading } = useSWR<CompstatResponse>(
    `/api/compstat?${query}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const availableDivisions = withAllOption(
    data?.filters.availableDivisions ?? [],
  );
  const availableCategories = withAllOption(
    data?.filters.availableCategories ?? [],
  );

  const resetFilters = () => {
    setDivision("ALL");
    setCategory("ALL");
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
      <FilterBar
        focusRange={focusRange}
        onFocusRangeChange={setFocusRange}
        division={division}
        offenseCategory={category}
        onDivisionChange={setDivision}
        onOffenseChange={setCategory}
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

      <SummaryGrid
        metrics={data?.windows ?? []}
        isLoading={isLoading && !data}
        focusRange={focusRange}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendCard
            data={data?.trend ?? []}
            isLoading={isLoading && !data}
          />
        </div>
        <FocusNarrative
          narrative={data?.focusNarrative}
          isLoading={isLoading && !data}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownList
          title="Top offense categories"
          items={data?.topOffenses ?? []}
          isLoading={isLoading && !data}
          emptyLabel="No offenses recorded in this window."
        />
        <BreakdownList
          title="Divisions by volume"
          items={data?.divisionLeaders ?? []}
          isLoading={isLoading && !data}
          emptyLabel="No divisions to rank."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CrimeMap incidents={data?.incidents ?? []} />
        <IncidentTable
          incidents={data?.incidents ?? []}
          isLoading={isLoading && !data}
        />
      </div>
    </section>
  );
};

export default Dashboard;
