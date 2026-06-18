"use client";

import { useEffect, useState } from "react";
import type { DisciplineWarnings } from "@/lib/bankroll";

export function WarningOverlay({ warnings }: { warnings: DisciplineWarnings }) {
  const [dismissed, setDismissed] = useState(false);
  const active = warnings.stopSession || warnings.lockProfit;

  useEffect(() => {
    setDismissed(false);
  }, [warnings.stopSession, warnings.lockProfit]);

  if (!active || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur">
      <div className={`max-w-3xl rounded-[2rem] border p-8 text-center shadow-2xl ${warnings.stopSession ? "border-red-400 bg-red-950" : "border-gold bg-yellow-950"}`}>
        <p className="text-sm font-black uppercase tracking-[0.42em] text-white/70">Discipline rule triggered</p>
        <h2 className="mt-4 text-5xl font-black text-white sm:text-7xl">{warnings.stopSession ? "STOP SESSION" : "LOCK PROFIT"}</h2>
        <p className="mt-6 text-xl text-white/90">{warnings.stopSession ? "Your stop-loss is reached. End the session now. Do not chase losses." : "Your profit target is reached. Bank the win and end the session."}</p>
        <button type="button" onClick={() => setDismissed(true)} className="mt-8 rounded-full border border-white/30 px-8 py-3 font-black text-white transition hover:bg-white/10">
          I understand
        </button>
      </div>
    </div>
  );
}
