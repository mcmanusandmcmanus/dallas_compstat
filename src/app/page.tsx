import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-10 md:px-8">
        <header className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            Dallas Police Department
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            CompStat Command Brief
          </h1>
          <p className="text-base text-white/70 md:text-lg">
            Real-time NIBRS offenses, spatial hot spots, and Poisson
            significance bands built directly on the City of Dallas open
            dataset. Adjust the division, offense mix, or time horizon to
            generate a meeting-ready brief in seconds.
          </p>
        </header>

        <Dashboard />
      </div>
    </div>
  );
}
