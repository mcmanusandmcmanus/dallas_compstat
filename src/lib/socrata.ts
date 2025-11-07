import { randomUUID } from "crypto";
import {
  type BreakdownRow,
  type DashboardFilters,
  type DateRange,
  type IncidentFeature,
} from "./types";

const DATASET_URL =
  "https://www.dallasopendata.com/resource/qv6i-rri7.json";
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; payload: unknown }>();
let lastSocrataSuccessISO: string | null = null;
let lastSocrataError:
  | { timestamp: string; message: string; status?: number }
  | null = null;

const sanitize = (value: string) => value.replace(/'/g, "''").trim();

const buildInClause = (field: string, values: string[]) => {
  if (!values.length) {
    return "";
  }
  const entries = values.map((value) => `'${sanitize(value)}'`).join(",");
  return `${field} IN (${entries})`;
};

const yearClause = (years: string[]) => {
  if (years.length === 0) {
    return "";
  }
  if (years.length === 1) {
    return `year1='${years[0]}'`;
  }

  const joined = years.map((year) => `'${year}'`).join(",");
  return `year1 in (${joined})`;
};

const buildWhere = (
  range: DateRange,
  filters: DashboardFilters,
  extraClauses: string[] = [],
) => {
  const clauses = [
    yearClause(range.years),
    `date1 between '${range.start}' AND '${range.end}'`,
  ];

  if (filters.division) {
    clauses.push(`division='${sanitize(filters.division)}'`);
  }

  if (filters.offenseCategory) {
    clauses.push(
      `nibrs_crime_category='${sanitize(filters.offenseCategory)}'`,
    );
  }

  clauses.push(...extraClauses);

  return clauses.filter(Boolean).join(" AND ");
};

const buildUrl = (params: Record<string, string>) => {
  const url = new URL(DATASET_URL);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value),
  );
  if (APP_TOKEN) {
    url.searchParams.append("$$app_token", APP_TOKEN);
  }
  return url;
};

const socrataFetch = async <T>(params: Record<string, string>) => {
  const url = buildUrl(params);
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.payload as T;
  }

  const response = await fetch(url, {
    headers: APP_TOKEN
      ? {
          "X-App-Token": APP_TOKEN,
        }
      : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    lastSocrataError = {
      timestamp: new Date().toISOString(),
      message: text.slice(0, 200),
      status: response.status,
    };
    throw new Error(
      `Failed to query Socrata (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as T;
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
  lastSocrataSuccessISO = new Date().toISOString();
  lastSocrataError = null;
  return payload;
};

export const fetchCountForRange = async (
  range: DateRange,
  filters: DashboardFilters,
): Promise<number> => {
  const results = await socrataFetch<
    Array<{ count?: string }>
  >({
    $select: "count(incidentnum) as count",
    $where: buildWhere(range, filters),
    $limit: "1",
  });

  const raw = results?.[0]?.count;
  return raw ? Number(raw) : 0;
};

export const fetchTopOffenses = async (
  range: DateRange,
  filters: DashboardFilters,
  limit = 8,
  onlyLabels?: string[],
): Promise<BreakdownRow[]> => {
  const rows = await socrataFetch<
    Array<{ category?: string; count?: string }>
  >({
    $select: "nibrs_crime_category as category, count(incidentnum) as count",
    $where: buildWhere(range, filters, [
      "nibrs_crime_category IS NOT NULL",
      onlyLabels?.length
        ? buildInClause("nibrs_crime_category", onlyLabels)
        : "",
    ]),
    $group: "nibrs_crime_category",
    $order: "count DESC",
    $limit: String(onlyLabels?.length ?? limit),
  });

  return rows.map((row) => ({
    label: row.category ?? "Uncoded",
    count: Number(row.count ?? 0),
    changePct: 0,
  }));
};

export const fetchDivisions = async (
  range: DateRange,
  filters: DashboardFilters,
  limit = 8,
  onlyLabels?: string[],
): Promise<BreakdownRow[]> => {
  const rows = await socrataFetch<
    Array<{ division?: string; count?: string }>
  >({
    $select: "division, count(incidentnum) as count",
    $where: buildWhere(range, filters, [
      "division IS NOT NULL",
      onlyLabels?.length
        ? buildInClause("division", onlyLabels)
        : "",
    ]),
    $group: "division",
    $order: "count DESC",
    $limit: String(onlyLabels?.length ?? limit),
  });

  return rows.map((row) => ({
    label: row.division ?? "Unassigned",
    count: Number(row.count ?? 0),
    changePct: 0,
  }));
};

export const fetchDistinctValues = async (field: string) => {
  const rows = await socrataFetch<Array<Record<string, string>>>({
    $select: `${field}`,
    $where: `${field} IS NOT NULL`,
    $group: field,
    $order: field,
    $limit: "50",
  });

  return rows
    .map((row) => row[field])
    .filter((value): value is string => Boolean(value));
};

export const fetchDailyTrend = async (
  range: DateRange,
  filters: DashboardFilters,
): Promise<Array<{ day: string; count: number }>> => {
  const rows = await socrataFetch<
    Array<{ day?: string; count?: string }>
  >({
    $select:
      "substring(date1,0,11) as day, count(incidentnum) as count",
    $where: buildWhere(range, filters),
    $group: "substring(date1,0,11)",
    $order: "day",
    $limit: "400",
  });

  return rows
    .filter((row) => row.day)
    .map((row) => ({
      day: row.day!.substring(0, 10),
      count: Number(row.count ?? 0),
    }));
};

export const fetchIncidents = async (
  range: DateRange,
  filters: DashboardFilters,
  limit = 350,
): Promise<IncidentFeature[]> => {
  const rows = await socrataFetch<
    Array<{
      incidentnum?: string;
      offincident?: string;
      mo?: string;
      status?: string;
      date1?: string;
      division?: string;
      beat?: string;
      geocoded_column?: { latitude?: string; longitude?: string };
    }>
  >({
    $select:
      "incidentnum, offincident, mo, status, date1, division, beat, geocoded_column",
    $where: buildWhere(range, filters, [
      "geocoded_column IS NOT NULL",
      "beat IS NOT NULL",
    ]),
    $order: "date1 DESC",
    $limit: String(limit),
  });

  return rows
    .filter(
      (row) =>
        row.geocoded_column?.latitude && row.geocoded_column?.longitude,
    )
    .map((row) => ({
      id: row.incidentnum ?? randomUUID(),
      offense: row.offincident ?? "Unspecified offense",
      narrative: row.mo ?? "No modus operandi recorded.",
      status: row.status ?? "Pending",
      occurred: row.date1 ?? "",
      division: row.division ?? "Unknown",
      beat: row.beat ?? "Unknown",
      latitude: Number(row.geocoded_column?.latitude),
      longitude: Number(row.geocoded_column?.longitude),
    }));
};

export const fetchDayOfWeekCounts = async (
  range: DateRange,
  filters: DashboardFilters,
) => {
  const rows = await socrataFetch<
    Array<{ day?: string; count?: string }>
  >({
    $select: "day1 as day, count(incidentnum) as count",
    $where: buildWhere(range, filters, ["day1 IS NOT NULL"]),
    $group: "day1",
    $order: "day",
  });

  const orderMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return rows
    .filter((row) => row.day)
    .map((row) => ({
      label: row.day!,
      order: orderMap.indexOf(row.day!),
      count: Number(row.count ?? 0),
    }))
    .filter((item) => item.order >= 0)
    .sort((a, b) => a.order - b.order);
};

export const fetchHourOfDayCounts = async (
  range: DateRange,
  filters: DashboardFilters,
) => {
  const rows = await socrataFetch<
    Array<{ hour?: string; count?: string }>
  >({
    $select:
      "substring(time1,0,3) as hour, count(incidentnum) as count",
    $where: buildWhere(range, filters, ["time1 IS NOT NULL"]),
    $group: "substring(time1,0,3)",
    $order: "hour",
  });

  return rows
    .filter((row) => row.hour)
    .map((row) => {
      const hour = row.hour!.slice(0, 2);
      const order = Number(hour);
      return {
        label: `${hour}:00`,
        order: Number.isFinite(order) ? order : 0,
        count: Number(row.count ?? 0),
      };
    })
    .sort((a, b) => a.order - b.order);
};

export const getSocrataHealth = () => ({
  lastSuccess: lastSocrataSuccessISO,
  lastError: lastSocrataError,
});
