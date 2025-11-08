"use client";

import { useEffect } from "react";

interface CrimeCodeReferenceModalProps {
  onClose: () => void;
}

const DIFFERENCE_ROWS = [
  {
    offense: "Money laundering",
    code: "26H",
    texas: "Property",
    fbi: "Society",
    notes: "TxNIBRS keeps it with financial/property crimes; FBI rolls it into Society when submitting.",
  },
  {
    offense: "Failure to register as sex offender",
    code: "360",
    texas: "Person",
    fbi: "Society",
    notes: "Texas treats it like a person crime for dashboards; submit to FBI as Society to avoid validation errors.",
  },
  {
    offense: "Sex offenses 11B / 11C",
    code: "11B–11C",
    texas: "Separate Person offenses",
    fbi: "Separate Person offenses",
    notes: "Legacy UCR combines into 11A; keep them discrete in dashboards to match NIBRS rows.",
  },
  {
    offense: "Human trafficking – sexual servitude of minor",
    code: "64C",
    texas: "Person",
    fbi: "Map to 64A",
    notes: "State extension; map to 64A when exporting to the national data warehouse.",
  },
];

export const CrimeCodeReferenceModal = ({
  onClose,
}: CrimeCodeReferenceModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-emerald-400/40 bg-slate-900 text-white shadow-emerald-500/30 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-emerald-500/20 to-transparent px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">
              TX Crime Code Guide
            </p>
            <h2 className="text-2xl font-semibold text-white">
              NIBRS best practices (Texas vs FBI)
            </h2>
            <p className="text-sm text-white/70">
              Reference the most common classification differences before you
              export to CJIS. Use Texas guidance for analysis, then match the
              FBI table for national submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white/80 transition hover:border-white hover:text-white"
          >
            Close
          </button>
        </header>
        <div className="max-h-[60vh] space-y-6 overflow-auto px-6 py-6 text-sm text-white/80">
          <section>
            <h3 className="text-lg font-semibold text-white">
              Quick alignment checklist
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Keep 11B/11C (Sodomy, Sexual Assault w/ Object) separate when
                charting; legacy UCR combines them with 11A.
              </li>
              <li>
                Track 64C and 36C (state extensions) in dashboards but remap to
                64A / 11D when uploading to the FBI Data Warehouse.
              </li>
              <li>
                Money laundering (26H) and sex-offender registry cases (360)
                show up under Property/Person for Dallas dashboards—flag that
                they are <em>Society</em> in FBI validation.
              </li>
              <li>
                Human trafficking, kidnapping, and homicide rows always stay in
                Crime Against Person; negligent vehicular manslaughter (09D) is
                required for intoxication manslaughter incidents.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white">
              Texas vs FBI classification highlights
            </h3>
            <div className="mt-3 overflow-auto rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-xs uppercase tracking-wide text-white/70">
                <thead className="bg-white/5 text-[0.75rem] text-white">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Offense</th>
                    <th className="px-3 py-3 font-semibold">NIBRS</th>
                    <th className="px-3 py-3 font-semibold">Texas</th>
                    <th className="px-3 py-3 font-semibold">FBI</th>
                    <th className="px-3 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {DIFFERENCE_ROWS.map((row) => (
                    <tr
                      key={row.offense}
                      className="border-t border-white/5 bg-black/10"
                    >
                      <td className="px-3 py-3 font-semibold text-white">
                        {row.offense}
                      </td>
                      <td className="px-3 py-3 text-white/80">{row.code}</td>
                      <td className="px-3 py-3 text-emerald-200">{row.texas}</td>
                      <td className="px-3 py-3 text-sky-200">{row.fbi}</td>
                      <td className="px-3 py-3 text-white/70">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-xs">
            <p className="font-semibold text-white">Source links</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <a
                  href="https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/home"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline-offset-2 hover:underline"
                >
                  FBI CJIS Crime Data Explorer – NIBRS Offense Codes
                </a>
              </li>
              <li>
                <a
                  href="https://www.dps.texas.gov/section/crime-records/uniform-crime-reporting"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline-offset-2 hover:underline"
                >
                  Texas DPS TxNIBRS Reference
                </a>
              </li>
            </ul>
          </section>
        </div>
        <footer className="border-t border-white/10 px-6 py-4 text-xs text-white/60">
          Align analysis with Texas practice, then mirror CJIS classifications
          before exporting to the national repository.
        </footer>
      </div>
    </div>
  );
};
