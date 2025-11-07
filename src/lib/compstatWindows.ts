import { DateTime } from "luxon";
import type { CompstatWindowId, DateRange } from "./types";

const ZONE = "America/Chicago";
const DATE_FORMAT = "yyyy-LL-dd HH:mm:ss";

const WINDOW_LABELS: Record<CompstatWindowId, string> = {
  "7d": "Last 7 days",
  "28d": "Last 28 days",
  ytd: "Year to date",
  "365d": "Last 365 days",
};

const WINDOW_LENGTHS: Record<Exclude<CompstatWindowId, "ytd">, number> = {
  "7d": 7,
  "28d": 28,
  "365d": 365,
};

export const DEFAULT_FOCUS_WINDOW: CompstatWindowId = "28d";

const toQueryStamp = (value: DateTime) => value.toFormat(DATE_FORMAT);

const toYearsArray = (start: DateTime, end: DateTime) => {
  const span: number[] = [];
  let cursor = start.startOf("year");
  while (cursor.year <= end.year) {
    span.push(cursor.year);
    cursor = cursor.plus({ years: 1 });
  }
  return span.map(String);
};

const toRange = (start: DateTime, end: DateTime): DateRange => ({
  start: toQueryStamp(start),
  end: toQueryStamp(end),
  years: toYearsArray(start, end),
});

const fixedLengthRange = (
  days: number,
  now: DateTime,
): {
  current: DateRange;
  previous: DateRange;
  yearAgo: DateRange;
  days: number;
} => {
  const currentEnd = now.endOf("day");
  const currentStart = currentEnd.minus({ days: days - 1 }).startOf("day");
  const previousEnd = currentStart.minus({ days: 1 }).endOf("day");
  const previousStart = previousEnd.minus({ days: days - 1 }).startOf("day");
  const yearAgoStart = currentStart.minus({ years: 1 });
  const yearAgoEnd = currentEnd.minus({ years: 1 });

  return {
    current: toRange(currentStart, currentEnd),
    previous: toRange(previousStart, previousEnd),
    yearAgo: toRange(yearAgoStart, yearAgoEnd),
    days,
  };
};

const ytdRange = (
  now: DateTime,
): {
  current: DateRange;
  previous: DateRange;
  yearAgo: DateRange;
  days: number;
} => {
  const currentStart = now.startOf("year");
  const currentEnd = now.endOf("day");
  const days =
    Math.floor(currentEnd.diff(currentStart, "days").days) + 1;
  const previousEnd = currentStart.minus({ days: 1 }).endOf("day");
  const previousStart = previousEnd.minus({ days: days - 1 }).startOf("day");
  const yearAgoStart = currentStart.minus({ years: 1 });
  const yearAgoEnd = currentEnd.minus({ years: 1 });

  return {
    current: toRange(currentStart, currentEnd),
    previous: toRange(previousStart, previousEnd),
    yearAgo: toRange(yearAgoStart, yearAgoEnd),
    days,
  };
};

export const getWindowDefinition = (
  id: CompstatWindowId,
  reference: DateTime = DateTime.now().setZone(ZONE),
) => {
  if (id === "ytd") {
    const payload = ytdRange(reference);
    return {
      ...payload,
      id,
      label: WINDOW_LABELS[id],
    };
  }

  const payload = fixedLengthRange(WINDOW_LENGTHS[id], reference);
  return {
    ...payload,
    id,
    label: WINDOW_LABELS[id],
  };
};

export const getAllWindowDefinitions = (
  reference: DateTime = DateTime.now().setZone(ZONE),
) => {
  return (Object.keys(WINDOW_LABELS) as CompstatWindowId[]).map((key) =>
    getWindowDefinition(key, reference),
  );
};

export const buildRangeFromDates = (start: DateTime, end: DateTime): DateRange => {
  const normalizedStart = start.startOf("day");
  const normalizedEnd = end.endOf("day");
  return toRange(normalizedStart, normalizedEnd);
};
