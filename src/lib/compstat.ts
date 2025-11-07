import { DateTime } from "luxon";
import {
  DEFAULT_FOCUS_WINDOW,
  getAllWindowDefinitions,
  getWindowDefinition,
} from "./compstatWindows";
import {
  fetchCountForRange,
  fetchDailyTrend,
  fetchDayOfWeekCounts,
  fetchDivisions,
  fetchDistinctValues,
  fetchHourOfDayCounts,
  fetchIncidents,
  fetchTopOffenses,
} from "./socrata";
import type {
  BreakdownRow,
  CompstatMetric,
  CompstatResponse,
  CompstatWindowId,
  DashboardFilters,
  TrendPoint,
} from "./types";

const RESPONSE_CACHE = new Map<
  string,
  { expires: number; payload: CompstatResponse }
>();
const RESPONSE_TTL_MS = 2 * 60 * 1000;
const COMPSTAT_ZONE = "America/Chicago";
let lastCompstatSuccessISO: string | null = null;

const buildCacheKey = (
  filters: DashboardFilters,
  focusRange: CompstatWindowId,
) => JSON.stringify({ filters, focusRange });

const getCachedEntry = (
  filters: DashboardFilters,
  focusRange: CompstatWindowId,
) => {
  const key = buildCacheKey(filters, focusRange);
  const cached = RESPONSE_CACHE.get(key);
  return { key, cached };
};

export const getCachedCompstatResponse = (
  filters: DashboardFilters,
  focusRange: CompstatWindowId,
  options: { allowStale?: boolean } = {},
) => {
  const { cached } = getCachedEntry(filters, focusRange);
  if (!cached) {
    return null;
  }
  if (!options.allowStale && cached.expires <= Date.now()) {
    return null;
  }
  return cached.payload;
};

const percentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

const poissonZ = (current: number, previous: number) => {
  if (current === 0 && previous === 0) {
    return 0;
  }
  const useAnscombe = current < 10 || previous < 10;
  const transform = (value: number) =>
    useAnscombe ? Math.sqrt(value + 0.375) : Math.sqrt(value);
  const currentRoot = transform(current);
  const previousRoot = transform(previous);
  return 2 * (currentRoot - previousRoot);
};

const zBand = (value: number) => {
  if (value >= 3.5) return "Spike";
  if (value >= 1) return "Elevated";
  if (value <= -1) return "Below Normal";
  return "Normal";
};

const mergeBreakdowns = (
  current: BreakdownRow[],
  previous: BreakdownRow[],
): BreakdownRow[] => {
  const previousMap = new Map(previous.map((row) => [row.label, row.count]));
  return current.map((row) => {
    const base = previousMap.get(row.label) ?? 0;
    return {
      ...row,
      changePct: percentChange(row.count, base),
    };
  });
};

const enrichTrend = (series: Array<{ day: string; count: number }>): TrendPoint[] => {
  const window = 7;
  return series.map((point, index, src) => {
    const start = Math.max(0, index - window + 1);
    const slice = src.slice(start, index + 1);
    const mean = slice.reduce((sum, item) => sum + item.count, 0) / slice.length;
    const std = Math.sqrt(Math.max(mean, 0));
    return {
      date: point.day,
      count: point.count,
      rollingAverage: Number(mean.toFixed(1)),
      upperBand: Number((mean + 3 * std).toFixed(1)),
      lowerBand: Number(Math.max(mean - 3 * std, 0).toFixed(1)),
    };
  });
};

const buildNarrative = (
  focusMetric: CompstatMetric,
  topOffense: BreakdownRow | undefined,
  topDivision: BreakdownRow | undefined,
) => {
  const pieces = [
    `${focusMetric.label}: ${focusMetric.current.toLocaleString()} incidents`,
    `vs ${focusMetric.previous.toLocaleString()} (${focusMetric.changePct.toFixed(
      1,
    )}% and ${focusMetric.zScore.toFixed(1)} z-score, ${focusMetric.classification}).`,
  ];

  if (topOffense) {
    pieces.push(
      `Most frequent offense: ${topOffense.label} (${topOffense.count.toLocaleString()} cases).`,
    );
  }
  if (topDivision) {
    pieces.push(
      `Highest volume division: ${topDivision.label} (${topDivision.count.toLocaleString()} cases).`,
    );
  }

  return pieces.join(" ");
};

export const buildCompstatResponse = async (
  filters: DashboardFilters,
  focusRange: CompstatWindowId = DEFAULT_FOCUS_WINDOW,
): Promise<CompstatResponse> => {
  const { key: cacheKey, cached } = getCachedEntry(filters, focusRange);
  if (cached && cached.expires > Date.now()) {
    return cached.payload;
  }

  const reference = DateTime.now().setZone(COMPSTAT_ZONE);

  const windowDefinitions = getAllWindowDefinitions(reference);
  const windowMetrics: CompstatMetric[] = await Promise.all(
    windowDefinitions.map(async (definition) => {
      const current = await fetchCountForRange(definition.current, filters);
      const previous = await fetchCountForRange(definition.previous, filters);
      const yearAgo = await fetchCountForRange(definition.yearAgo, filters);
      const changePct = percentChange(current, previous);
      const changePctYearAgo = percentChange(current, yearAgo);
      const zScore = poissonZ(current, previous);
      return {
        id: definition.id,
        label: definition.label,
        current,
        previous,
        changePct,
        yearAgo,
        changePctYearAgo,
        zScore,
        classification: zBand(zScore),
      };
    }),
  );

  const focusDefinition = getWindowDefinition(focusRange, reference);
  const [
    trendRaw,
    incidents,
    categoriesCurrent,
    divisionsCurrent,
    availableDivisions,
    availableCategories,
    dayOfWeek,
    hourOfDay,
  ] =
    await Promise.all([
      fetchDailyTrend(focusDefinition.current, filters),
      fetchIncidents(focusDefinition.current, filters),
      fetchTopOffenses(focusDefinition.current, filters),
      fetchDivisions(focusDefinition.current, filters),
      fetchDistinctValues("division"),
      fetchDistinctValues("nibrs_crime_category"),
      fetchDayOfWeekCounts(focusDefinition.current, filters),
      fetchHourOfDayCounts(focusDefinition.current, filters),
    ]);

  const offenseLabels = categoriesCurrent.map((row) => row.label);
  const divisionLabels = divisionsCurrent.map((row) => row.label);

  const [categoriesPrevious, divisionsPrevious] = await Promise.all([
    offenseLabels.length
      ? fetchTopOffenses(
          focusDefinition.previous,
          filters,
          offenseLabels.length,
          offenseLabels,
        )
      : Promise.resolve<BreakdownRow[]>([]),
    divisionLabels.length
      ? fetchDivisions(
          focusDefinition.previous,
          filters,
          divisionLabels.length,
          divisionLabels,
        )
      : Promise.resolve<BreakdownRow[]>([]),
  ]);

  const topOffenses = mergeBreakdowns(categoriesCurrent, categoriesPrevious);
  const divisionLeaders = mergeBreakdowns(
    divisionsCurrent,
    divisionsPrevious,
  );

  const focusMetric =
    windowMetrics.find((metric) => metric.id === focusRange) ??
    windowMetrics[0];

  const response: CompstatResponse = {
    generatedAt: new Date().toISOString(),
    filters: {
      focusRange,
      applied: filters,
      availableDivisions,
      availableCategories,
    },
    windows: windowMetrics,
    trend: enrichTrend(trendRaw),
    incidents,
    topOffenses,
    divisionLeaders,
    focusNarrative: buildNarrative(
      focusMetric,
      topOffenses[0],
      divisionLeaders[0],
    ),
    meta: { stale: false },
    dayOfWeek,
    hourOfDay,
  };

  RESPONSE_CACHE.set(cacheKey, {
    payload: response,
    expires: Date.now() + RESPONSE_TTL_MS,
  });
  lastCompstatSuccessISO = response.generatedAt;

  return response;
};

export const resetCompstatCache = () => RESPONSE_CACHE.clear();

export const getCompstatHealth = () => ({
  lastSuccess: lastCompstatSuccessISO,
});
