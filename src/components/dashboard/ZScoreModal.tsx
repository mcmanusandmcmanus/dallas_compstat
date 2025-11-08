"use client";

import { useEffect } from "react";
import type { CompstatMetric } from "@/lib/types";
import clsx from "clsx";

interface ZScoreModalProps {
  metric: CompstatMetric;
  onClose: () => void;
}

const classificationRing: Record<CompstatMetric["classification"], string> = {
  Spike: "text-rose-200 border-rose-300/40 bg-rose-500/10",
  Elevated: "text-amber-200 border-amber-300/40 bg-amber-500/10",
  Normal: "text-emerald-200 border-emerald-300/40 bg-emerald-500/10",
  "Below Normal": "text-sky-200 border-sky-300/40 bg-sky-500/10",
};

export const ZScoreModal = ({ metric, onClose }: ZScoreModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const delta = metric.current - metric.previous;
  const direction = delta >= 0 ? "increase" : "decrease";
  const impliedStd =
    metric.zScore !== 0
      ? Math.abs(delta) / Math.abs(metric.zScore)
      : null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Statistical distance
            </p>
            <h2 className="text-2xl font-semibold">
              Z-score for {metric.label}
            </h2>
            <p className="text-sm text-white/70">
              Indicates how many standard deviations the current period is
              away from the expected baseline.
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
        <div className="space-y-6 px-6 py-6 text-sm text-white/80">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-lg font-semibold text-white">
              z = {metric.zScore.toFixed(2)}
            </p>
            <span
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                classificationRing[metric.classification],
              )}
            >
              {metric.classification}
            </span>
          </div>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-base font-semibold text-white">
              How it is derived
            </p>
            <p>
              Difference between current and baseline counts:
              <span className="font-semibold text-white">
                {" "}
                {delta >= 0 ? "+" : "-"}
                {Math.abs(delta).toLocaleString()} incidents (
                {direction})
              </span>
            </p>
            <p>
              Z-score formula:{" "}
              <code className="rounded bg-slate-900/70 px-2 py-1 text-xs text-white">
                z = (current − expected) / σ
              </code>
            </p>
            {impliedStd ? (
              <p>
                Implied σ (standard deviation) ≈{" "}
                <span className="font-semibold text-white">
                  {impliedStd.toFixed(2)}
                </span>
              </p>
            ) : (
              <p>
                σ (standard deviation) cannot be estimated because the current
                period matches the baseline.
              </p>
            )}
            <p>
              Higher magnitudes mean the window is further away from the
              baseline noise band, which drives the{" "}
              <span className="font-semibold">{metric.classification}</span>{" "}
              badge on the card.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-widest text-white/50">
                Current window
              </p>
              <p className="text-lg font-semibold text-white">
                {metric.current.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-widest text-white/50">
                Prior window
              </p>
              <p className="text-lg font-semibold text-white">
                {metric.previous.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-widest text-white/50">
                Same time last year
              </p>
              <p className="text-lg font-semibold text-white">
                {metric.yearAgo.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <footer className="border-t border-white/10 px-6 py-3 text-xs text-white/60">
          Z-scores use a Poisson expectation around the rolling CompStat
          baseline for each window.
        </footer>
      </div>
    </div>
  );
};

export default ZScoreModal;
