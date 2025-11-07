import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-10 md:px-8">
        <Dashboard />
        <footer className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-white/70 shadow-lg shadow-slate-900/30">
          Weekly trend method inspired by{" "}
          <a
            href="https://crimede-coder.com/graphs/Dallas_Dashboard"
            className="text-emerald-300 underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Crime De-Coder (Andrew P. Wheeler)
          </a>
          . Source prep script:{" "}
          <a
            href="https://github.com/apwheele/apwheele/blob/main/dallas_data.py"
            className="text-emerald-300 underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            dallas_data.py
          </a>
          .
        </footer>
      </div>
    </div>
  );
}
