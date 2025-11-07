'use client';

interface FocusNarrativeProps {
  narrative?: string;
  isLoading: boolean;
}

export const FocusNarrative = ({
  narrative,
  isLoading,
}: FocusNarrativeProps) => {
  if (isLoading && !narrative) {
    return (
      <div className="h-[240px] animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-6 text-white shadow-lg shadow-slate-900/30">
      <header>
        <p className="text-sm uppercase tracking-wide text-white/60">
          Analyst highlight
        </p>
        <h3 className="mt-1 text-2xl font-semibold">
          CompStat focus
        </h3>
      </header>
      <p className="mt-4 flex-1 text-base leading-relaxed text-white/80">
        {narrative ??
          "Select filters or broaden the time window to generate a tactical narrative."}
      </p>
      <p className="mt-6 text-xs uppercase tracking-widest text-emerald-200">
        auto-generated from live data
      </p>
    </article>
  );
};
