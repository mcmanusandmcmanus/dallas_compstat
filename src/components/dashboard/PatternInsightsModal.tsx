"use client";

import { useEffect } from "react";
import type { DayOfWeekStat, HourOfDayStat } from "@/lib/types";
import { DayOfWeekChart } from "./DayOfWeekChart";
import { HourlyPatternChart } from "./HourlyPatternChart";

interface PatternInsightsModalProps {
  dayOfWeek: DayOfWeekStat[];
  hourOfDay: HourOfDayStat[];
  focusLabel?: string;
  onClose: () => void;
}

export const PatternInsightsModal = ({
  dayOfWeek,
  hourOfDay,
  focusLabel,
  onClose,
}: PatternInsightsModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const hasData =
    (dayOfWeek?.length ?? 0) > 0 || (hourOfDay?.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Temporal pattern explorer
            </p>
            <h2 className="text-2xl font-semibold">
              Day-of-week & hourly cadence
            </h2>
            <p className="text-sm text-white/70">
              Mirrors the &ldquo;Day-of-week pattern&rdquo; and &ldquo;Hourly cadence&rdquo; cards for rapid briefing inside the{" "}
              {focusLabel ?? "current focus window"} tile.
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
        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          {hasData ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <DayOfWeekChart data={dayOfWeek} isLoading={false} />
              <HourlyPatternChart data={hourOfDay} isLoading={false} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              No temporal pattern data is available for the current filters.
              Try broadening the window or choosing a division with more
              incidents.
            </div>
          )}
        </div>
        <footer className="border-t border-white/10 px-6 py-3 text-xs text-white/60">
          Source: Dallas Police Department RMS incidents ({'"'}qv6i-rri7{'"'}).
        </footer>
      </div>
    </div>
  );
};
