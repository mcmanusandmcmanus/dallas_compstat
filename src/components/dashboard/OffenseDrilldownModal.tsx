"use client";

import { useEffect } from "react";
import type { OffenseDrilldownRow } from "@/lib/types";

interface OffenseDrilldownModalProps {
  rows: OffenseDrilldownRow[];
  title: string;
  onClose: () => void;
}

const formatNumber = (value: number) => value.toLocaleString();

const formatChange = (value: number, changePct: number) => {
  const pct = Number.isFinite(changePct) ? changePct : 0;
  const signedValue = value >= 0 ? "+" : "−";
  const signedPct = pct >= 0 ? "+" : "−";
  return `${signedValue}${Math.abs(value).toLocaleString()} (${signedPct}${Math.abs(pct).toFixed(1)}%)`;
};

const groupOrder = (rows: OffenseDrilldownRow[]) =>
  Array.from(new Set(rows.map((row) => row.crimeAgainst)));

export const OffenseDrilldownModal = ({
  rows,
  title,
  onClose,
}: OffenseDrilldownModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!rows.length) {
    return null;
  }

  const orderedGroups = groupOrder(rows);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Validation Table
            </p>
            <h2 className="text-2xl font-semibold">
              {title} drilldown
            </h2>
            <p className="text-sm text-white/70">
              Aggregated NIBRS crime codes split by Person, Property, and Society classifications.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white hover:text-white"
          >
            Close
          </button>
        </header>
        <div className="max-h-[70vh] overflow-auto px-6 pb-6">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-950 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="py-3 pr-3 text-left font-semibold">Offense</th>
                <th className="py-3 pr-3 text-left font-semibold">Code</th>
                <th className="py-3 pr-3 text-right font-semibold">Current</th>
                <th className="py-3 pr-3 text-right font-semibold">Previous</th>
                <th className="py-3 pr-3 text-right font-semibold">Year Ago</th>
                <th className="py-3 pr-3 text-right font-semibold">Δ vs Prev</th>
                <th className="py-3 pr-3 text-right font-semibold">Δ vs Year</th>
                <th className="py-3 text-right font-semibold">Poisson Z</th>
              </tr>
            </thead>
            {orderedGroups.map((group) => {
              const groupRows = rows.filter(
                (row) => row.crimeAgainst === group,
              );
              if (!groupRows.length) {
                return null;
              }
              return (
                <tbody key={group}>
                  <tr>
                    <th
                      colSpan={8}
                      className="bg-white/5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
                    >
                      {group} Crimes
                    </th>
                  </tr>
                  {groupRows.map((row) => {
                    const diffPrev = row.current - row.previous;
                    const diffYear = row.current - row.yearAgo;
                    const diffPrevClass =
                      diffPrev >= 0 ? "text-rose-200" : "text-emerald-200";
                    const diffYearClass =
                      diffYear >= 0 ? "text-rose-200" : "text-emerald-200";
                    const zClass =
                      row.zScore >= 3.5
                        ? "text-rose-300"
                        : row.zScore >= 2
                          ? "text-amber-200"
                          : row.zScore <= -2
                            ? "text-sky-200"
                            : "text-white";
                    return (
                      <tr
                        key={row.code}
                        className="border-b border-white/5 last:border-0 hover:bg-white/5"
                      >
                        <td className="py-3 pr-3 font-medium text-white">
                          {row.label}
                        </td>
                        <td className="py-3 pr-3 text-white/70">
                          {row.code}
                        </td>
                        <td className="py-3 pr-3 text-right text-white">
                          {formatNumber(row.current)}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/70">
                          {formatNumber(row.previous)}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/70">
                          {formatNumber(row.yearAgo)}
                        </td>
                        <td className={`py-3 pr-3 text-right ${diffPrevClass}`}>
                          {formatChange(diffPrev, row.changePct)}
                        </td>
                        <td className={`py-3 pr-3 text-right ${diffYearClass}`}>
                          {formatChange(diffYear, row.changePctYearAgo)}
                        </td>
                        <td className={`py-3 text-right font-semibold ${zClass}`}>
                          {row.zScore.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
        <footer className="border-t border-white/10 px-6 py-3 text-xs text-white/60">
          Source: Dallas Police Department RMS incidents ({'"'}qv6i-rri7{'"'}) filtered by the current dashboard selections.
        </footer>
      </div>
    </div>
  );
};
