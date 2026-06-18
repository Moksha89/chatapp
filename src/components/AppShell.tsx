"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { calculateStats, evaluateDiscipline, type BlackjackSession } from "@/lib/bankroll";
import { getActiveSession } from "@/lib/storage";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/start", label: "Start Session" },
  { href: "/settings", label: "Strategy Settings" },
  { href: "/history", label: "History" },
  { href: "/reports", label: "Reports" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<BlackjackSession | undefined>();

  useEffect(() => {
    const refresh = () => setSession(getActiveSession());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("blackjack-session-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("blackjack-session-updated", refresh);
    };
  }, []);

  const stats = session ? calculateStats(session) : undefined;
  const warnings = session ? evaluateDiscipline(session) : undefined;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-obsidian/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="group">
            <p className="text-xs uppercase tracking-[0.36em] text-gold/80">Manual-only</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Blackjack Discipline Assistant</h1>
          </Link>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-gold/60 hover:text-gold">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {session && stats && (
          <div className="border-t border-white/10 bg-charcoal/90">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-3 text-sm md:grid-cols-6">
              <Status label="Session P/L" value={`${stats.profitLoss >= 0 ? "+" : ""}${stats.profitLoss}`} danger={stats.profitLoss < 0} />
              <Status label="Hands" value={`${stats.totalHands}/${session.config.maxHands}`} />
              <Status label="Accuracy" value={`${stats.strategyAccuracy}%`} danger={stats.strategyAccuracy < 80} />
              <Status label="Loss streak" value={stats.currentLosingStreak} danger={stats.currentLosingStreak >= 3} />
              <Status label="Loss limit left" value={stats.remainingLossLimit} danger={stats.remainingLossLimit === 0} />
              <Status label="Time left" value={`${stats.remainingMinutes}m`} danger={stats.remainingMinutes === 0} />
            </div>
            {warnings && warnings.messages.length > 0 && (
              <div className="border-t border-red-500/30 bg-red-950/60 px-4 py-2 text-center text-sm font-black uppercase tracking-wide text-red-100">
                {warnings.messages[0]}
              </div>
            )}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-sm text-zinc-400">
        <div className="rounded-3xl border border-gold/20 bg-gold/10 p-4">
          This tool is for discipline, education, and bankroll control only. It does not guarantee profit. Blackjack and casino games have a house edge. Never gamble with money you cannot afford to lose.
        </div>
      </footer>
    </div>
  );
}

function Status({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`text-lg font-black ${danger ? "text-red-300" : "text-gold"}`}>{value}</p>
    </div>
  );
}
