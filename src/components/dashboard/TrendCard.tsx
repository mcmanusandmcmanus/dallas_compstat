"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

const formatLabel = (value: string) => {
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const [count] = payload;
  const rolling = payload.find((item) => item.name === "Avg");
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3 text-sm text-white">
      <p className="font-semibold">{formatLabel(label ?? "")}</p>
      <p className="text-white/80">
        Incidents:{" "}
        <span className="font-semibold">
          {count?.value?.toLocaleString()}
        </span>
      </p>
      {rolling ? (
        <p className="text-white/60">
          Rolling avg: {rolling.value.toFixed(1)}
        </p>
      ) : null}
    </div>
  );
};

export const TrendCard = ({ data, isLoading }: TrendCardProps) => {
  if (isLoading && data.length === 0) {
    return (
      <div className="h-[360px] animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-white">
        <p className="text-lg font-semibold">Incident trend</p>
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
          <p className="text-sm uppercase tracking-wide text-white/60">
            Daily incidents
          </p>
          <p className="text-3xl font-semibold">
            {latest?.count.toLocaleString()}{" "}
            <span className="text-sm font-normal text-white/60">
              latest day
            </span>
          </p>
        </div>
        <div className="text-right text-sm text-white/60">
          <div>
            Rolling avg:{" "}
            <span className="font-semibold text-white">
              {latest?.rollingAverage.toFixed(1)}
            </span>
          </div>
          <div>
            Alert band: {latest?.lowerBand.toFixed(0)} -{" "}
            {latest?.upperBand.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="countFill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="#34d399"
                  stopOpacity={0.4}
                />
                <stop
                  offset="100%"
                  stopColor="#34d399"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff12" strokeDasharray="5 5" />
            <XAxis
              dataKey="date"
              tickFormatter={formatLabel}
              stroke="#ffffff66"
              tickMargin={10}
            />
            <YAxis
              stroke="#ffffff66"
              tickFormatter={(value) => value.toFixed(0)}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#34d399"
              fill="url(#countFill)"
              name="Incidents"
            />
            <Line
              type="monotone"
              dataKey="rollingAverage"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              name="Avg"
            />
            <Line
              type="monotone"
              dataKey="upperBand"
              stroke="#f87171"
              strokeDasharray="4 4"
              dot={false}
              name="Upper band"
            />
            <Line
              type="monotone"
              dataKey="lowerBand"
              stroke="#38bdf8"
              strokeDasharray="4 4"
              dot={false}
              name="Lower band"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

