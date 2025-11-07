"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/types";

interface TrendCardProps {
  data: TrendPoint[];
  isLoading: boolean;
}

const formatShort = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatWeekRange = (point: TrendPoint) => {
  const start = new Date(`${point.date}T00:00:00Z`);
  const endValue = point.endDate ?? point.date;
  const end = new Date(`${endValue}T00:00:00Z`);
  return `${formatShort(point.date)} – ${formatShort(endValue)}, ${start.getUTCFullYear()}`;
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: TrendPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }
  const avgEntry = payload.find((item) => item.name === "Prior 8-week avg");
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3 text-sm text-white">
      <p className="font-semibold">{formatWeekRange(point)}</p>
      <p className="text-white/80">
        Incidents:{" "}
        <span className="font-semibold">
          {point.count.toLocaleString()}
        </span>
      </p>
      {avgEntry ? (
        <p className="text-white/60">
          Prior 8-week avg: {avgEntry.value.toFixed(1)}
        </p>
      ) : null}
      <p className="text-white/50">
        Expected range: {point.lowerBand.toFixed(1)} –{" "}
        {point.upperBand.toFixed(1)}
      </p>
    </div>
  );
};

export const TrendCard = ({ data, isLoading }: TrendCardProps) => {
  if (isLoading && data.length === 0) {
    return (
      <div className="h-[420px] animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-white">
        <p className="text-lg font-semibold">Weekly crime counts</p>
        <p className="mt-2 text-sm text-white/60">
          Add a division or broaden the time window to see trend data.
        </p>
      </div>
    );
  }

  const latest = data.at(-1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm uppercase tracking-wide text-white/60">
              Weekly crime counts
            </p>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Crime De-Coder method
            </span>
          </div>
          <p className="text-3xl font-semibold">
            {latest?.count.toLocaleString()}{" "}
            <span className="text-sm font-normal text-white/60">
              latest full week
            </span>
          </p>
          {latest ? (
            <p className="text-xs uppercase tracking-widest text-white/50">
              {formatWeekRange(latest)}
            </p>
          ) : null}
        </div>
        <div className="text-right text-sm text-white/60">
          <div>
            Prior 8-week avg:{" "}
            <span className="font-semibold text-white">
              {latest?.rollingAverage.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-white/50">
            Bands from Poisson ±3σ expectation
          </p>
        </div>
      </div>

      <div className="mt-4 h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="bandFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff12" strokeDasharray="5 5" />
            <XAxis
              dataKey="date"
              stroke="#ffffff66"
              tickMargin={10}
              tickFormatter={formatShort}
            />
            <YAxis
              stroke="#ffffff66"
              tickFormatter={(value) => value.toFixed(0)}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="upperBand"
              stroke="none"
              fill="url(#bandFill)"
              activeDot={false}
              isAnimationActive={false}
              name="Expected range"
            />
            <Area
              type="monotone"
              dataKey="lowerBand"
              stroke="none"
              fill="#0f172a"
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="rollingAverage"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              name="Prior 8-week avg"
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#34d399"
              strokeWidth={3}
              dot={{ r: 3 }}
              name="Actual weekly count"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

