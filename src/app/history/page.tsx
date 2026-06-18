"use client";

import { useEffect, useState } from "react";
import { ActionBadge } from "@/components/ActionBadge";
import { calculateStats, type BlackjackSession } from "@/lib/bankroll";
import { downloadCsv, sessionsToCsv } from "@/lib/csv";
import { getSessionHistory, saveSessionHistory } from "@/lib/storage";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<BlackjackSession[]>([]);

  useEffect(() => {
    setSessions(getSessionHistory());
  }, []);

  function exportCsv() {
    downloadCsv("blackjack-session-history.csv", sessionsToCsv(sessions));
  }

  function clearHistory() {
    saveSessionHistory([]);
    setSessions([]);
  }

  const totalProfitLoss = sessions.flatMap((session) => session.hands).reduce((sum, hand) => sum + hand.profitLoss, 0);
  const totalHands = sessions.reduce((sum, session) => sum + session.hands.length, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-gold/20 bg-charcoal/80 p-6 shadow-gold">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-gold">History</p>
            <h2 className="mt-2 text-4xl font-black text-white">Previous sessions</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} className="rounded-full bg-gold px-5 py-3 font-black text-black hover:bg-yellow-300">Export CSV</button>
            <button type="button" onClick={clearHistory} className="rounded-full border border-red-400/40 px-5 py-3 font-black text-red-200 hover:bg-red-500/10">Clear</button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Total P/L" value={`${totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss}`} danger={totalProfitLoss < 0} />
          <Metric label="Sessions" value={sessions.length} />
          <Metric label="Hands" value={totalHands} />
        </div>
      </section>

      <div className="space-y-4">
        {sessions.length === 0 && <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-zinc-300">No archived sessions yet. End an active session to store it here.</div>}
        {sessions.map((session) => {
          const stats = calculateStats(session);
          return (
            <article key={session.id} className="rounded-[2rem] border border-white/10 bg-charcoal/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{new Date(session.startedAt).toLocaleString()}</p>
                  <h3 className="mt-1 text-2xl font-black text-white">Session P/L: <span className={stats.profitLoss < 0 ? "text-red-300" : "text-gold"}>{stats.profitLoss >= 0 ? "+" : ""}{stats.profitLoss}</span></h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <SmallStat label="Hands" value={stats.totalHands} />
                  <SmallStat label="Accuracy" value={`${stats.strategyAccuracy}%`} />
                  <SmallStat label="W/L/P" value={`${stats.wins}/${stats.losses}/${stats.pushes}`} />
                  <SmallStat label="Loss streak" value={stats.biggestLossStreak} />
                </div>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    <tr><th className="p-2">#</th><th className="p-2">Cards</th><th className="p-2">Dealer</th><th className="p-2">Rec</th><th className="p-2">User</th><th className="p-2">Result</th><th className="p-2">P/L</th></tr>
                  </thead>
                  <tbody>
                    {session.hands.map((hand) => (
                      <tr key={hand.id} className="border-t border-white/10">
                        <td className="p-2 text-zinc-400">{hand.handNumber}</td>
                        <td className="p-2 font-bold text-white">{hand.playerCards.join(" ")}</td>
                        <td className="p-2">{hand.dealerCard}</td>
                        <td className="p-2"><ActionBadge action={hand.recommendedAction} /></td>
                        <td className="p-2">{hand.userAction}</td>
                        <td className="p-2 capitalize">{hand.result}</td>
                        <td className={`p-2 font-black ${hand.profitLoss < 0 ? "text-red-300" : "text-gold"}`}>{hand.profitLoss}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return <div className="rounded-3xl border border-white/10 bg-black/30 p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-2 text-3xl font-black ${danger ? "text-red-300" : "text-gold"}`}>{value}</p></div>;
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2"><p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="font-black text-gold">{value}</p></div>;
}
