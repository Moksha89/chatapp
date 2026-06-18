"use client";

import { useEffect, useState } from "react";
import { type BlackjackSession } from "@/lib/bankroll";
import { buildReportSummary } from "@/lib/reports";
import { getSessionHistory } from "@/lib/storage";

export default function ReportsPage() {
  const [sessions, setSessions] = useState<BlackjackSession[]>([]);

  useEffect(() => {
    setSessions(getSessionHistory());
  }, []);

  const summary = buildReportSummary(sessions);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-gold/20 bg-charcoal/80 p-6 shadow-gold">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-gold">Reports</p>
        <h2 className="mt-2 text-4xl font-black text-white">Discipline analytics</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Total P/L" value={`${summary.totalProfitLoss >= 0 ? "+" : ""}${summary.totalProfitLoss}`} danger={summary.totalProfitLoss < 0} />
          <Metric label="Number of hands" value={summary.totalHands} />
          <Metric label="Strategy accuracy" value={`${summary.strategyAccuracy}%`} danger={summary.strategyAccuracy < 80} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Biggest mistake patterns" items={summary.biggestMistakePatterns} empty="No strategy mistakes logged yet." />
        <ReportCard title="Most common aggression triggers" items={summary.aggressionTriggers} empty="No bet increases after losses logged yet." />
      </section>

      <section className="rounded-[2rem] border border-red-400/30 bg-red-950/40 p-6 text-red-50">
        <p className="text-sm font-black uppercase tracking-[0.28em]">Responsible gambling reminders</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Reminder title="No recovery betting" text="A bigger bet after a loss is flagged as aggression, never encouraged." />
          <Reminder title="Stop means stop" text="Stop-loss and time limits are designed to interrupt emotional play." />
          <Reminder title="Education only" text="Basic strategy can reduce mistakes, but it does not remove the house edge." />
        </div>
      </section>
    </div>
  );
}

function ReportCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-charcoal/80 p-6">
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.length === 0 && <li className="rounded-2xl border border-white/10 bg-black/30 p-4 text-zinc-400">{empty}</li>}
        {items.map((item) => <li key={item} className="rounded-2xl border border-white/10 bg-black/30 p-4 font-semibold text-zinc-100">{item}</li>)}
      </ul>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return <div className="rounded-3xl border border-white/10 bg-black/30 p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-2 text-3xl font-black ${danger ? "text-red-300" : "text-gold"}`}>{value}</p></div>;
}

function Reminder({ title, text }: { title: string; text: string }) {
  return <div className="rounded-3xl border border-red-300/20 bg-black/20 p-4"><p className="font-black text-white">{title}</p><p className="mt-2 text-sm text-red-100/80">{text}</p></div>;
}
