import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayOfWeekStat } from "@/lib/types";

interface DayOfWeekChartProps {
  data: DayOfWeekStat[];
  isLoading: boolean;
}

const tooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: DayOfWeekStat }>;
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

export const DayOfWeekChart = ({
  data,
  isLoading,
}: DayOfWeekChartProps) => {
  if (isLoading && !data.length) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30">
      <header className="flex flex-wrap items-center justify-between text-sm text-white/70">
        <p className="font-semibold">Day-of-week pattern</p>
        <p className="text-xs uppercase tracking-widest text-emerald-200">
          Current focus window
        </p>
      </header>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#ffffff12" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#ffffff66"
              tickLine={false}
            />
            <YAxis
              stroke="#ffffff66"
              tickFormatter={(value) => value.toFixed(0)}
              tickLine={false}
              width={40}
            />
            <Tooltip content={tooltip} />
            <Bar
              dataKey="count"
              fill="url(#dowFill)"
              radius={[6, 6, 0, 0]}
            />
            <defs>
              <linearGradient id="dowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.2} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
