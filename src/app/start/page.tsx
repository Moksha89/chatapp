"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSession, type SessionConfig } from "@/lib/bankroll";
import { defaultRules, type GameRules } from "@/lib/blackjack";
import { getSettings, saveActiveSession, saveSettings } from "@/lib/storage";

export default function StartSessionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SessionConfig>({
    startingBankroll: 1000,
    sessionBudget: 200,
    baseBet: 10,
    maximumBet: 50,
    stopLossAmount: 100,
    profitTarget: 120,
    maxHands: 60,
    maxSessionMinutes: 90,
  });
  const [rules, setRules] = useState<GameRules>(defaultRules);

  useEffect(() => {
    const settings = getSettings();
    setConfig(settings.sessionConfig);
    setRules(settings.rules);
  }, []);

  function updateConfig(key: keyof SessionConfig, value: number) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function startSession() {
    const session = createSession(config, rules);
    saveSettings({ ...getSettings(), sessionConfig: config, rules });
    saveActiveSession(session);
    window.dispatchEvent(new Event("blackjack-session-updated"));
    router.push("/");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="rounded-[2rem] border border-gold/20 bg-charcoal/80 p-6 shadow-gold">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-gold">Before you play</p>
        <h2 className="mt-3 text-4xl font-black text-white">Set strict bankroll limits.</h2>
        <p className="mt-3 text-zinc-300">The assistant will show full-screen warnings when stop-loss or profit target rules are hit.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <NumberField label="Starting bankroll" value={config.startingBankroll} onChange={(value) => updateConfig("startingBankroll", value)} />
          <NumberField label="Session budget" value={config.sessionBudget} onChange={(value) => updateConfig("sessionBudget", value)} />
          <NumberField label="Base bet" value={config.baseBet} onChange={(value) => updateConfig("baseBet", value)} />
          <NumberField label="Maximum bet" value={config.maximumBet} onChange={(value) => updateConfig("maximumBet", value)} />
          <NumberField label="Stop-loss amount" value={config.stopLossAmount} onChange={(value) => updateConfig("stopLossAmount", value)} />
          <NumberField label="Profit target" value={config.profitTarget} onChange={(value) => updateConfig("profitTarget", value)} />
          <NumberField label="Max hands" value={config.maxHands} onChange={(value) => updateConfig("maxHands", value)} />
          <NumberField label="Max session duration (minutes)" value={config.maxSessionMinutes} onChange={(value) => updateConfig("maxSessionMinutes", value)} />
        </div>
        <button type="button" onClick={startSession} className="mt-6 w-full rounded-2xl bg-gold px-5 py-4 text-lg font-black text-black transition hover:bg-yellow-300">
          Start disciplined manual session
        </button>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/50 p-6">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-gold">Seed strategy settings</p>
        <div className="mt-5 space-y-4">
          <Toggle label="Dealer hits soft 17" value={rules.dealerHitsSoft17} onChange={(value) => setRules((current) => ({ ...current, dealerHitsSoft17: value }))} />
          <Toggle label="Double after split allowed" value={rules.doubleAfterSplit} onChange={(value) => setRules((current) => ({ ...current, doubleAfterSplit: value }))} />
          <Toggle label="Surrender allowed" value={rules.surrenderAllowed} onChange={(value) => setRules((current) => ({ ...current, surrenderAllowed: value }))} />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Number of decks</span>
            <select value={rules.decks} onChange={(event) => setRules((current) => ({ ...current, decks: Number(event.target.value) as GameRules["decks"] }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold">
              {[1, 2, 4, 6, 8].map((deck) => <option key={deck} value={deck}>{deck}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Blackjack payout</span>
            <select value={rules.blackjackPayout} onChange={(event) => setRules((current) => ({ ...current, blackjackPayout: event.target.value as GameRules["blackjackPayout"] }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold">
              <option value="3:2">3:2</option>
              <option value="6:5">6:5</option>
            </select>
          </label>
        </div>
        <div className="mt-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
          No martingale, no recovery betting, no automation. Stop-loss rules are deliberately prominent.
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <input min="0" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold" />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:border-gold/50">
      <span className="font-bold text-zinc-100">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${value ? "bg-gold text-black" : "bg-zinc-700 text-zinc-200"}`}>{value ? "YES" : "NO"}</span>
    </button>
  );
}
