"use client";

import { Fragment, useMemo } from "react";
import type {
  CompstatWindowId,
  OffenseDrilldownRow,
} from "@/lib/types";
import clsx from "clsx";

const WINDOW_ORDER: CompstatWindowId[] = ["7d", "28d", "ytd", "365d"];
const WINDOW_LABELS: Record<CompstatWindowId, string> = {
  "7d": "Last 7 days",
  "28d": "Last 28 days",
  ytd: "Year to date",
  "365d": "Last 365 days",
};

const CRIME_AGAINST_ORDER = ["Person", "Property", "Society", "Unclassified"];

interface ValidationTableModalProps {
  drilldown?: Partial<Record<CompstatWindowId, OffenseDrilldownRow[]>>;
  onClose: () => void;
}

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const clamped = Math.max(-999, Math.min(999, value));
  return `${clamped.toFixed(1)}%`;
};

const formatZ = (value: number) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(1);
};

export const ValidationTableModal = ({
  drilldown,
  onClose,
}: ValidationTableModalProps) => {
  const rows = useMemo(() => {
    if (!drilldown) {
      return [];
    }
    const map = new Map<
      string,
      {
        code: string;
        label: string;
        crimeAgainst: string;
        metrics: Partial<Record<CompstatWindowId, OffenseDrilldownRow>>;
      }
    >();
    for (const windowId of WINDOW_ORDER) {
      const entries = drilldown[windowId];
      if (!entries?.length) {
        continue;
      }
      entries.forEach((entry) => {
        const key = `${entry.code}-${entry.label}`;
        if (!map.has(key)) {
          map.set(key, {
            code: entry.code,
            label: entry.label,
            crimeAgainst: entry.crimeAgainst ?? "Unclassified",
            metrics: {},
          });
        }
        map.get(key)!.metrics[windowId] = entry;
      });
    }
    const result = Array.from(map.values());
    result.sort((a, b) => {
      const groupDelta =
        CRIME_AGAINST_ORDER.indexOf(a.crimeAgainst) -
        CRIME_AGAINST_ORDER.indexOf(b.crimeAgainst);
      if (groupDelta !== 0) {
        return groupDelta;
      }
      const aScore = WINDOW_ORDER.reduce(
        (sum, id) => sum + (a.metrics[id]?.current ?? 0),
        0,
      );
      const bScore = WINDOW_ORDER.reduce(
        (sum, id) => sum + (b.metrics[id]?.current ?? 0),
        0,
      );
      return bScore - aScore;
    });
    return result;
  }, [drilldown]);

  const groupedRows = useMemo(() => {
    return CRIME_AGAINST_ORDER.map((group) => ({
      group,
      rows: rows.filter(
        (row) => (row.crimeAgainst ?? "Unclassified") === group,
      ),
    })).filter((entry) => entry.rows.length > 0);
  }, [rows]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-6xl flex-col rounded-3xl border border-white/15 bg-slate-950/95 text-white shadow-2xl shadow-black/50">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
              Validation tables
            </p>
            <h2 className="text-2xl font-semibold">
              Offense drilldown by window
            </h2>
            <p className="text-sm text-white/70">
              Personnel-ready view of NIBRS categories with 7d / 28d / YTD /
              365d counts, percent change, and Poisson alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white hover:text-white"
          >
            Close
          </button>
        </header>
        <div className="max-h-[78vh] overflow-auto px-6 py-4">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-center text-sm text-white/70">
              No validation rows available for the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-xs leading-tight text-white/80">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="whitespace-nowrap px-3 py-3 text-left font-semibold uppercase tracking-[0.25em] text-white/60"
                    >
                      Crime Against
                    </th>
                    <th
                      rowSpan={2}
                      className="whitespace-nowrap px-3 py-3 text-left font-semibold uppercase tracking-[0.25em] text-white/60"
                    >
                      Offense / Code
                    </th>
                    {WINDOW_ORDER.map((id) => (
                      <th
                        key={`window-${id}`}
                        colSpan={3}
                        className="px-3 py-3 text-center font-semibold uppercase tracking-[0.25em] text-emerald-200"
                      >
                        {WINDOW_LABELS[id]}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {WINDOW_ORDER.flatMap((id) => [
                      <th
                        key={`${id}-count`}
                        className="px-3 py-2 text-center font-semibold text-white/60"
                      >
                        Count
                      </th>,
                      <th
                        key={`${id}-pct`}
                        className="px-3 py-2 text-center font-semibold text-white/60"
                      >
                        % Δ
                      </th>,
                      <th
                        key={`${id}-z`}
                        className="px-3 py-2 text-center font-semibold text-white/60"
                      >
                        z
                      </th>,
                    ])}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedRows.map((group) => (
                    <Fragment key={group.group}>
                      {group.rows.map((row, rowIndex) => (
                        <tr
                          key={`${row.code}-${row.label}`}
                          className={clsx(
                            rowIndex % 2 === 0
                              ? "bg-white/0"
                              : "bg-white/5",
                          )}
                        >
                          {rowIndex === 0 ? (
                            <td
                              rowSpan={group.rows.length}
                              className="whitespace-nowrap px-3 py-3 text-sm font-semibold tracking-[0.15em] text-white"
                            >
                              {group.group}
                            </td>
                          ) : null}
                          <td className="px-3 py-3 text-sm font-medium text-white">
                            <div>{row.label}</div>
                            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
                              {row.code}
                            </div>
                          </td>
                          {WINDOW_ORDER.flatMap((id) => {
                            const metric = row.metrics[id];
                            const changeClass = metric
                              ? metric.changePct >= 5
                                ? "text-emerald-300"
                                : metric.changePct <= -5
                                  ? "text-rose-300"
                                  : "text-white/70"
                              : "text-white/40";
                            const zClass = metric
                              ? Math.abs(metric.zScore) >= 2
                                ? "text-amber-300"
                                : "text-white/70"
                              : "text-white/40";
                            return [
                              <td
                                key={`${row.code}-${id}-count`}
                                className="px-3 py-3 text-center font-semibold text-white"
                              >
                                {metric?.current?.toLocaleString() ?? "—"}
                              </td>,
                              <td
                                key={`${row.code}-${id}-pct`}
                                className={clsx("px-3 py-3 text-center", changeClass)}
                              >
                                {metric ? formatPercent(metric.changePct) : "—"}
                              </td>,
                              <td
                                key={`${row.code}-${id}-z`}
                                className={clsx("px-3 py-3 text-center", zClass)}
                              >
                                {metric ? formatZ(metric.zScore) : "—"}
                              </td>,
                            ];
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <footer className="border-t border-white/10 px-6 py-3 text-right text-[0.7rem] uppercase tracking-[0.25em] text-white/50">
          Source: Dallas Police Department RMS incidents (qv6i-rri7)
        </footer>
      </div>
    </div>
  );
};
