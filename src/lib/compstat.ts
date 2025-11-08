import { DateTime } from "luxon";
import {
  DEFAULT_FOCUS_WINDOW,
  buildRangeFromDates,
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
  fetchOffenseDetails,
  fetchTopOffenses,
} from "./socrata";
import type {
  BreakdownRow,
  CompstatMetric,
  CompstatResponse,
  CompstatWindowId,
  DashboardFilters,
  TrendPoint,
  IncidentFeature,
  OffenseDrilldownRow,
} from "./types";

const RESPONSE_CACHE = new Map<
  string,
  { expires: number; payload: CompstatResponse }
>();
const RESPONSE_TTL_MS = 2 * 60 * 1000;
const COMPSTAT_ZONE = "America/Chicago";
const CRIME_AGAINST_ORDER: Record<string, number> = {
  Person: 0,
  Property: 1,
  Society: 2,
};
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

const PRIOR_WEEKS = 8;
const HISTORY_YEARS = 3;

const buildWeeklyTrend = (series: Array<{ day: string; count: number }>): TrendPoint[] => {
  if (!series.length) {
    return [];
  }

  const sorted = [...series].sort((a, b) => a.day.localeCompare(b.day));
  const firstDay = DateTime.fromISO(sorted[0].day, { zone: COMPSTAT_ZONE }).startOf("day");
  const lastDay = DateTime.fromISO(sorted[sorted.length - 1].day, {
    zone: COMPSTAT_ZONE,
  }).startOf("day");

  const weekdayIndex = firstDay.weekday - 1;
  const beginWeek = firstDay.plus({ days: 7 - weekdayIndex });

  if (beginWeek >= lastDay) {
    return [];
  }

  const totalWeeks = Math.floor(lastDay.diff(beginWeek, "days").days / 7);
  if (totalWeeks <= PRIOR_WEEKS) {
    return [];
  }

  const weekSpanEnd = beginWeek.plus({ days: totalWeeks * 7 });
  const weekCounts = new Array(totalWeeks).fill(0);

  for (const point of sorted) {
    const current = DateTime.fromISO(point.day, { zone: COMPSTAT_ZONE }).startOf("day");
    if (current < beginWeek || current >= weekSpanEnd) {
      continue;
    }
    const diffWeeks = Math.floor(current.diff(beginWeek, "days").days / 7);
    if (diffWeeks >= 0 && diffWeeks < totalWeeks) {
      weekCounts[diffWeeks] += point.count;
    }
  }

  const prefixSums = new Array(totalWeeks + 1).fill(0);
  for (let index = 0; index < totalWeeks; index++) {
    prefixSums[index + 1] = prefixSums[index] + weekCounts[index];
  }

  const trend: TrendPoint[] = [];
  for (let index = PRIOR_WEEKS; index < totalWeeks; index++) {
    const weekStart = beginWeek.plus({ days: index * 7 });
    const weekEnd = weekStart.plus({ days: 6 });
    const current = weekCounts[index];
    const priorSum = prefixSums[index] - prefixSums[index - PRIOR_WEEKS];
    const priorAverage = priorSum / PRIOR_WEEKS;
    const sqrtAvg = Math.sqrt(Math.max(priorAverage, 0));
    const lowerBound = Math.max(Math.pow(-1.5 + sqrtAvg, 2), 0);
    const upperBound = Math.pow(1.5 + sqrtAvg, 2);

    trend.push({
      date: weekStart.toISODate() ?? weekStart.toFormat("yyyy-LL-dd"),
      endDate: weekEnd.toISODate() ?? weekEnd.toFormat("yyyy-LL-dd"),
      count: current,
      rollingAverage: Number(priorAverage.toFixed(1)),
      lowerBand: Number(lowerBound.toFixed(1)),
      upperBand: Number(upperBound.toFixed(1)),
    });
  }

  return trend;
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

const summarizeIncidents = (items: IncidentFeature[], key: "offense" | "division"): BreakdownRow[] => {
  const map = new Map<string, number>();
  for (const item of items) {
    const raw = key === "offense" ? item.offense : item.division;
    const label = raw?.trim() || (key === "offense" ? "Unspecified offense" : "Unassigned division");
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, changePct: 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const buildOffenseDrilldown = async (
  windowId: CompstatWindowId,
  reference: DateTime,
  filters: DashboardFilters,
): Promise<OffenseDrilldownRow[]> => {
  const definition = getWindowDefinition(windowId, reference);
  const [current, previous, yearAgo] = await Promise.all([
    fetchOffenseDetails(definition.current, filters),
    fetchOffenseDetails(definition.previous, filters),
    fetchOffenseDetails(definition.yearAgo, filters),
  ]);

  const toMap = (
    rows: Array<{ code: string; label: string; crimeAgainst: string; count: number }>,
  ) => new Map(rows.map((row) => [row.code, row]));

  const currentMap = toMap(current);
  const previousMap = toMap(previous);
  const yearAgoMap = toMap(yearAgo);

  const metadata = new Map<string, { label: string; crimeAgainst: string }>();
  const seed = (
    rows: Array<{ code: string; label: string; crimeAgainst: string }>,
  ) => {
    rows.forEach((row) => {
      if (!metadata.has(row.code)) {
        metadata.set(row.code, {
          label: row.label,
          crimeAgainst: row.crimeAgainst,
        });
      }
    });
  };

  seed(current);
  seed(previous);
  seed(yearAgo);

  return Array.from(metadata.entries())
    .map(([code, meta]) => {
      const currentValue = currentMap.get(code)?.count ?? 0;
      const previousValue = previousMap.get(code)?.count ?? 0;
      const yearAgoValue = yearAgoMap.get(code)?.count ?? 0;

      if (
        currentValue === 0 &&
        previousValue === 0 &&
        yearAgoValue === 0
      ) {
        return null;
      }

      return {
        code,
        label: meta.label,
        crimeAgainst: meta.crimeAgainst,
        current: currentValue,
        previous: previousValue,
        yearAgo: yearAgoValue,
        changePct: percentChange(currentValue, previousValue),
        changePctYearAgo: percentChange(currentValue, yearAgoValue),
        zScore: poissonZ(currentValue, previousValue),
      };
    })
    .filter((row): row is OffenseDrilldownRow => Boolean(row))
    .sort((a, b) => {
      const aOrder = CRIME_AGAINST_ORDER[a.crimeAgainst] ?? 99;
      const bOrder = CRIME_AGAINST_ORDER[b.crimeAgainst] ?? 99;
      if (aOrder === bOrder) {
        return b.current - a.current;
      }
      return aOrder - bOrder;
    });
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
  const historyEnd = reference.endOf("day");
  const historyStart = historyEnd.minus({ years: HISTORY_YEARS }).startOf("day");
  const historyRange = buildRangeFromDates(historyStart, historyEnd);
  const historyDays =
    Math.floor(historyEnd.diff(historyStart, "days").days) + 1;
  const historyLimit = Math.max(historyDays + 7, 500);
  const [
    trendHistory,
    incidents,
    categoriesCurrent,
    divisionsCurrent,
    availableDivisions,
    availableCategories,
    dayOfWeek,
    hourOfDay,
  ] =
    await Promise.all([
      fetchDailyTrend(historyRange, filters, { limit: historyLimit }),
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
  const incidentCategories = summarizeIncidents(incidents, "offense");
  const incidentDivisions = summarizeIncidents(incidents, "division");

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

  const drilldown7d = await buildOffenseDrilldown("7d", reference, filters);
  const drilldownPayload =
    drilldown7d.length > 0 ? { "7d": drilldown7d } : undefined;

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
    trend: buildWeeklyTrend(trendHistory),
    incidents,
    incidentCategories,
    incidentDivisions,
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
    drilldown: drilldownPayload,
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




