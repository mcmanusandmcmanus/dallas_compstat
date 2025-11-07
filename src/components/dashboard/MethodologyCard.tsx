interface MethodologyCardProps {
  generatedAt?: string;
  isStale?: boolean;
}

const formatTimestamp = (value?: string) => {
  if (!value) return "n/a";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const MethodologyCard = ({
  generatedAt,
  isStale,
}: MethodologyCardProps) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-sm text-white shadow-lg shadow-slate-900/40">
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
        <span>Transparency</span>
        <span>
          Last refresh:{" "}
          <span className="text-white/80">
            {formatTimestamp(generatedAt)}
            {isStale ? " (cached)" : ""}
          </span>
        </span>
      </header>
      <ul className="mt-4 space-y-3 text-white/80">
        <li>
          <span className="font-semibold text-white">
            Data source.
          </span>{" "}
          Dallas Police Department RMS incidents ({'"'}qv6i-rri7{'"'}) via
          Socrata. Anonymous filters only; sensitive offense classes are
          excluded upstream.
        </li>
        <li>
          <span className="font-semibold text-white">
            Windows &amp; deltas.
          </span>{" "}
          Summary tiles compare current 7d/28d/YTD/365d totals against the
          immediately prior window <em>and</em> the same dates one year ago.
          Percent change = (current - comparison) / comparison * 100.
        </li>
        <li>
          <span className="font-semibold text-white">
            Significance.
          </span>{" "}
          Poisson z-scores use an Anscombe transform for counts under 10.
          Spike >= 3.5, Elevated >= 1.0. Bands in the trend card show +/- 3 sigma
          around the rolling average.
        </li>
        <li>
          <span className="font-semibold text-white">
            Location handling.
          </span>{" "}
          The map displays the public open-data coordinates (already filtered
          by DPD). Treat markers as approximate and confirm tactical addresses
          in RMS before acting.
        </li>
      </ul>
    </section>
  );
};
