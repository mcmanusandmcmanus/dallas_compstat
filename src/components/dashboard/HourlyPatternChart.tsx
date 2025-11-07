import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourOfDayStat } from "@/lib/types";

interface HourlyPatternChartProps {
  data: HourOfDayStat[];
  isLoading: boolean;
}

const tooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: HourOfDayStat }>;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white">
      <p className="font-semibold">{row.label}</p>
      <p>{row.count.toLocaleString()} incidents</p>
    </div>
  );
};

export const HourlyPatternChart = ({
  data,
  isLoading,
}: HourlyPatternChartProps) => {
  if (isLoading && !data.length) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30">
      <header className="flex flex-wrap items-center justify-between text-sm text-white/70">
        <p className="font-semibold">Hourly cadence</p>
        <p className="text-xs">Current focus window</p>
      </header>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#ffffff12" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#ffffff66"
              tickLine={false}
              interval={2}
            />
            <YAxis
              stroke="#ffffff66"
              tickFormatter={(value) => value.toFixed(0)}
              tickLine={false}
              width={50}
            />
            <Tooltip content={tooltip} />
            <defs>
              <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="count"
              stroke="#c084fc"
              fill="url(#hourFill)"
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
