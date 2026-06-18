"use client";

import { useEffect, useState } from "react";
import { defaultRules, type GameRules } from "@/lib/blackjack";
import { defaultSessionConfig, type SessionConfig } from "@/lib/bankroll";
import { getSettings, saveSettings } from "@/lib/storage";

export default function SettingsPage() {
  const [rules, setRules] = useState<GameRules>(defaultRules);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>(defaultSessionConfig);
  const [aiExplanationEnabled, setAiExplanationEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setRules(settings.rules);
    setSessionConfig(settings.sessionConfig);
    setAiExplanationEnabled(settings.aiExplanationEnabled);
  }, []);

  function save() {
    saveSettings({ rules, sessionConfig, aiExplanationEnabled });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[2rem] border border-gold/20 bg-charcoal/80 p-6 shadow-gold">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-gold">Strategy settings</p>
        <h2 className="mt-3 text-4xl font-black text-white">Deterministic engine rules</h2>
        <div className="mt-6 space-y-4">
          <Toggle label="Dealer hits soft 17" value={rules.dealerHitsSoft17} onChange={(value) => setRules((current) => ({ ...current, dealerHitsSoft17: value }))} />
          <Toggle label="Double after split" value={rules.doubleAfterSplit} onChange={(value) => setRules((current) => ({ ...current, doubleAfterSplit: value }))} />
          <Toggle label="Late surrender allowed" value={rules.surrenderAllowed} onChange={(value) => setRules((current) => ({ ...current, surrenderAllowed: value }))} />
          <Select label="Number of decks" value={rules.decks} values={[1, 2, 4, 6, 8]} onChange={(value) => setRules((current) => ({ ...current, decks: value as GameRules["decks"] }))} />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Blackjack payout</span>
            <select value={rules.blackjackPayout} onChange={(event) => setRules((current) => ({ ...current, blackjackPayout: event.target.value as GameRules["blackjackPayout"] }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold">
              <option value="3:2">3:2</option>
              <option value="6:5">6:5</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/50 p-6">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-gold">App settings</p>
        <div className="mt-6 space-y-4">
          <Toggle label="Optional OpenRouter explanations" value={aiExplanationEnabled} onChange={setAiExplanationEnabled} />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-zinc-300">
            AI explanations are optional. They can explain the deterministic action only. The model cannot override Hit, Stand, Double, Split, or Surrender.
          </div>
          <div className="rounded-3xl border border-gold/20 bg-gold/10 p-4 text-gold">
            OpenRouter key must stay in environment variable <code>OPENROUTER_API_KEY</code>. Do not store it in local storage or source code.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Default base bet" value={sessionConfig.baseBet} onChange={(value) => setSessionConfig((current) => ({ ...current, baseBet: value }))} />
            <NumberField label="Default max bet" value={sessionConfig.maximumBet} onChange={(value) => setSessionConfig((current) => ({ ...current, maximumBet: value }))} />
            <NumberField label="Default stop-loss" value={sessionConfig.stopLossAmount} onChange={(value) => setSessionConfig((current) => ({ ...current, stopLossAmount: value }))} />
            <NumberField label="Default profit target" value={sessionConfig.profitTarget} onChange={(value) => setSessionConfig((current) => ({ ...current, profitTarget: value }))} />
          </div>
          <button type="button" onClick={save} className="w-full rounded-2xl bg-gold px-5 py-4 font-black text-black hover:bg-yellow-300">{saved ? "Saved" : "Save settings"}</button>
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:border-gold/50">
      <span className="font-bold text-zinc-100">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${value ? "bg-gold text-black" : "bg-zinc-700 text-zinc-200"}`}>{value ? "ON" : "OFF"}</span>
    </button>
  );
}

function Select<T extends number>({ label, value, values, onChange }: { label: string; value: T; values: T[]; onChange: (value: T) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value) as T)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold">
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
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
