"use client";

import type { IncidentFeature } from "@/lib/types";

interface IncidentTableProps {
  incidents: IncidentFeature[];
  isLoading: boolean;
  maxRows?: number;
}

const formatDateTime = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const IncidentTable = ({
  incidents,
  isLoading,
  maxRows = 7,
}: IncidentTableProps) => {
  if (isLoading && incidents.length === 0) {
    return (
      <div className="h-[420px] animate-pulse rounded-2xl border border-white/5 bg-white/5" />
    );
  }

  const display = incidents.slice(0, maxRows);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/40 text-white shadow-lg shadow-slate-900/30">
      <header className="border-b border-white/5 px-5 py-4">
        <p className="text-sm font-semibold text-white/80">
          Latest incidents ({display.length.toLocaleString()} of {incidents.length.toLocaleString()})
        </p>
        <p className="text-xs uppercase tracking-widest text-emerald-200">
          Current focus window
        </p>
        <p className="text-xs text-white/60">
          Live sample of geocoded incidents in the selected window. Showing the most recent {display.length} entries.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {display.length === 0 ? (
          <p className="py-12 text-sm text-white/60">
            No mapped incidents in this view.
          </p>
        ) : (
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                <th className="py-3">Offense</th>
                <th className="py-3">Division / beat</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Occurred</th>
              </tr>
            </thead>
            <tbody>
              {display.map((incident) => (
                <tr
                  key={incident.id}
                  className="border-t border-white/5 text-white/80"
                >
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-white">
                      {incident.offense}
                    </p>
                    <p className="text-xs text-white/60">
                      {incident.narrative}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-white">
                    <p className="font-semibold">
                      {incident.division}
                    </p>
                    <p className="text-xs text-white/60">
                      Beat {incident.beat}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                      {incident.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-white">
                    {formatDateTime(incident.occurred)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

