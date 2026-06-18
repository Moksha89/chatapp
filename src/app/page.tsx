"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActionBadge } from "@/components/ActionBadge";
import { CardButtons } from "@/components/CardButtons";
import { WarningOverlay } from "@/components/WarningOverlay";
import { buildHandLog, calculateStats, evaluateDiscipline, type BlackjackSession, type HandResult } from "@/lib/bankroll";
import { fallbackExplanation } from "@/lib/ai";
import { analyzeHand, defaultRules, recommendAction, type BlackjackAction, type Rank, type StrategyRecommendation } from "@/lib/blackjack";
import { archiveSession, getActiveSession, getSettings, saveActiveSession } from "@/lib/storage";

const actions: BlackjackAction[] = ["Hit", "Stand", "Double", "Split", "Surrender"];
const results: HandResult[] = ["win", "loss", "push", "blackjack"];

export default function DashboardPage() {
  const [session, setSession] = useState<BlackjackSession | undefined>();
  const [playerCards, setPlayerCards] = useState<Rank[]>([]);
  const [dealerCard, setDealerCard] = useState<Rank | undefined>();
  const [target, setTarget] = useState<"player" | "dealer">("player");
  const [splitHands, setSplitHands] = useState<Rank[][]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [userAction, setUserAction] = useState<BlackjackAction>("Hit");
  const [result, setResult] = useState<HandResult>("loss");
  const [profitLoss, setProfitLoss] = useState(-10);
  const [notes, setNotes] = useState("");
  const [nextBetAmount, setNextBetAmount] = useState(10);
  const [explanation, setExplanation] = useState("");
  const [explanationSource, setExplanationSource] = useState<"openrouter" | "fallback">("fallback");
  const settings = typeof window !== "undefined" ? getSettings() : undefined;
  const currentHand = splitHands.length > 0 ? splitHands[activeSplitIndex] : playerCards;
  const rules = session?.rules ?? settings?.rules ?? defaultRules;
  const recommendation = useMemo(() => recommendAction(currentHand, dealerCard, rules), [currentHand, dealerCard, rules]);
  const stats = session ? calculateStats(session) : undefined;
  const warnings = session ? evaluateDiscipline(session, nextBetAmount) : undefined;

  useEffect(() => {
    const stored = getActiveSession();
    setSession(stored);
    const savedSettings = getSettings();
    setBetAmount(savedSettings.sessionConfig.baseBet);
    setNextBetAmount(savedSettings.sessionConfig.baseBet);
    setProfitLoss(-savedSettings.sessionConfig.baseBet);
  }, []);

  useEffect(() => {
    setUserAction(recommendation.action);
  }, [recommendation.action]);

  useEffect(() => {
    if (result === "loss") setProfitLoss(-Math.abs(betAmount));
    if (result === "win") setProfitLoss(Math.abs(betAmount));
    if (result === "push") setProfitLoss(0);
    if (result === "blackjack") setProfitLoss(Math.round(betAmount * (rules.blackjackPayout === "3:2" ? 1.5 : 1.2) * 100) / 100);
  }, [betAmount, result, rules.blackjackPayout]);

  useEffect(() => {
    let cancelled = false;
    async function loadExplanation(activeRecommendation: StrategyRecommendation) {
      const savedSettings = getSettings();
      if (!savedSettings.aiExplanationEnabled || activeRecommendation.warning) {
        setExplanation(fallbackExplanation(activeRecommendation));
        setExplanationSource("fallback");
        return;
      }
      try {
        const response = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recommendation: activeRecommendation, playerCards: currentHand, dealerCard }),
        });
        const data = (await response.json()) as { explanation: string; source: "openrouter" | "fallback" };
        if (!cancelled) {
          setExplanation(data.explanation);
          setExplanationSource(data.source);
        }
      } catch {
        if (!cancelled) {
          setExplanation(fallbackExplanation(activeRecommendation));
          setExplanationSource("fallback");
        }
      }
    }
    void loadExplanation(recommendation);
    return () => {
      cancelled = true;
    };
  }, [recommendation, currentHand, dealerCard]);

  function dispatchUpdate(updated?: BlackjackSession) {
    saveActiveSession(updated);
    setSession(updated);
    window.dispatchEvent(new Event("blackjack-session-updated"));
  }

  function addCard(rank: Rank) {
    if (target === "dealer") {
      setDealerCard(rank);
      return;
    }
    if (splitHands.length > 0) {
      setSplitHands((hands) => hands.map((hand, index) => (index === activeSplitIndex ? [...hand, rank] : hand)));
      return;
    }
    setPlayerCards((cards) => [...cards, rank]);
  }

  function newHand() {
    setPlayerCards([]);
    setDealerCard(undefined);
    setSplitHands([]);
    setActiveSplitIndex(0);
    setTarget("player");
    setNotes("");
  }

  function startSplitFlow() {
    if (!recommendation.hand.isPair || currentHand.length !== 2) return;
    setSplitHands([[currentHand[0]], [currentHand[1]]]);
    setActiveSplitIndex(0);
    setPlayerCards([]);
    setTarget("player");
  }

  function logHand() {
    if (!session) return;
    const hand = buildHandLog(
      {
        betAmount,
        playerCards: currentHand,
        dealerCard,
        recommendedAction: recommendation.action,
        userAction,
        result,
        profitLoss,
        notes,
      },
      session.hands,
    );
    const updated = { ...session, hands: [...session.hands, hand] };
    dispatchUpdate(updated);
    setNextBetAmount(betAmount);
    newHand();
  }

  function endSession() {
    if (!session) return;
    archiveSession(session);
    dispatchUpdate(undefined);
  }

  if (!session) {
    return (
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-gold/20 bg-charcoal/80 p-8 shadow-gold">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-gold">Safe manual assistant</p>
          <h2 className="mt-4 text-4xl font-black text-white sm:text-6xl">Start a disciplined session first.</h2>
          <p className="mt-4 max-w-2xl text-lg text-zinc-300">This app never connects to Stake or any gambling website. It only accepts manually entered cards and manually logged results.</p>
          <Link href="/start" className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 font-black text-black transition hover:bg-yellow-300">
            Start Session
          </Link>
        </div>
        <SafetyCard />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {warnings && <WarningOverlay warnings={warnings} />}
      {warnings && warnings.messages.length > 0 && (
        <div className="rounded-[2rem] border border-red-400/40 bg-red-950/70 p-5 text-red-50">
          <p className="text-sm font-black uppercase tracking-[0.24em]">Visible discipline warnings</p>
          <ul className="mt-3 list-inside list-disc space-y-1">
            {warnings.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6 rounded-[2rem] border border-white/10 bg-charcoal/80 p-5 shadow-gold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-gold">Manual card entry</p>
              <h2 className="text-3xl font-black text-white">Current Hand</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={newHand} className="rounded-full border border-white/15 px-4 py-2 font-semibold text-zinc-200 hover:border-gold hover:text-gold">New hand</button>
              <button type="button" onClick={endSession} className="rounded-full border border-red-400/40 px-4 py-2 font-semibold text-red-200 hover:bg-red-500/10">End session</button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HandPanel title="Player cards" active={target === "player"} cards={currentHand} onSelect={() => setTarget("player")} onClear={() => (splitHands.length > 0 ? setSplitHands((hands) => hands.map((hand, index) => (index === activeSplitIndex ? [] : hand))) : setPlayerCards([]))} />
            <HandPanel title="Dealer up-card" active={target === "dealer"} cards={dealerCard ? [dealerCard] : []} onSelect={() => setTarget("dealer")} onClear={() => setDealerCard(undefined)} />
          </div>

          {splitHands.length > 0 && (
            <div className="rounded-3xl border border-purple-400/30 bg-purple-500/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-100">Split hand flow</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {splitHands.map((hand, index) => (
                  <button key={`${hand.join("-")}-${index}`} type="button" onClick={() => setActiveSplitIndex(index)} className={`rounded-full border px-4 py-2 font-bold ${activeSplitIndex === index ? "border-purple-200 bg-purple-400/20 text-white" : "border-white/10 text-zinc-300"}`}>
                    Hand {index + 1}: {hand.join(" ") || "empty"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CardButtons onSelect={addCard} />
        </div>

        <div className="space-y-6">
          <RecommendationPanel recommendation={recommendation} explanation={explanation} explanationSource={explanationSource} onSplit={startSplitFlow} />
          <LogPanel betAmount={betAmount} setBetAmount={setBetAmount} nextBetAmount={nextBetAmount} setNextBetAmount={setNextBetAmount} userAction={userAction} setUserAction={setUserAction} result={result} setResult={setResult} profitLoss={profitLoss} setProfitLoss={setProfitLoss} notes={notes} setNotes={setNotes} onLog={logHand} canLog={currentHand.length >= 2 && dealerCard !== undefined} />
        </div>
      </section>

      {stats && (
        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Win / Loss / Push" value={`${stats.wins}/${stats.losses}/${stats.pushes}`} />
          <Metric label="Blackjacks" value={stats.blackjacks} />
          <Metric label="Biggest loss streak" value={stats.biggestLossStreak} danger={stats.biggestLossStreak >= 3} />
          <Metric label="Strategy mistakes" value={stats.strategyMistakes} danger={stats.strategyMistakes > 0} />
        </section>
      )}
    </div>
  );
}

function HandPanel({ title, active, cards, onSelect, onClear }: { title: string; active: boolean; cards: Rank[]; onSelect: () => void; onClear: () => void }) {
  const hand = analyzeHand(cards);
  return (
    <button type="button" onClick={onSelect} className={`rounded-[1.5rem] border p-5 text-left transition ${active ? "border-gold bg-gold/10" : "border-white/10 bg-black/30 hover:border-white/30"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">{title}</p>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">{active ? "Adding here" : "Tap to select"}</span>
      </div>
      <p className="mt-4 min-h-12 text-4xl font-black text-white">{cards.length ? cards.join(" ") : "—"}</p>
      <p className="mt-2 text-lg font-bold text-gold">{cards.length ? hand.label : "No cards"}</p>
      <span onClick={(event) => { event.stopPropagation(); onClear(); }} className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-zinc-300 hover:border-red-300 hover:text-red-200">
        Clear
      </span>
    </button>
  );
}

function RecommendationPanel({ recommendation, explanation, explanationSource, onSplit }: { recommendation: StrategyRecommendation; explanation: string; explanationSource: "openrouter" | "fallback"; onSplit: () => void }) {
  return (
    <div className="rounded-[2rem] border border-gold/20 bg-black/60 p-6 shadow-gold">
      <p className="text-sm font-black uppercase tracking-[0.32em] text-gold">Recommendation</p>
      <div className="mt-5"><ActionBadge action={recommendation.action} large /></div>
      <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-200">{recommendation.confidence}</p>
      <p className="mt-3 text-lg text-zinc-200">{recommendation.reason}</p>
      {recommendation.warning && <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm font-semibold text-yellow-100">{recommendation.warning}</p>}
      {recommendation.action === "Split" && <button type="button" onClick={onSplit} className="mt-4 rounded-full border border-purple-300/50 px-4 py-2 font-black text-purple-100 hover:bg-purple-500/10">Start split hand flow</button>}
      <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Explanation ({explanationSource})</p>
        <p className="mt-2 text-zinc-200">{explanation}</p>
      </div>
      <div className="mt-4 grid gap-2 text-center text-sm font-black uppercase tracking-[0.18em] sm:grid-cols-2">
        <div className="rounded-2xl bg-red-500/15 p-3 text-red-100">Do not chase losses</div>
        <div className="rounded-2xl bg-gold/15 p-3 text-gold">Follow strategy, not emotion</div>
      </div>
    </div>
  );
}

function LogPanel({ betAmount, setBetAmount, nextBetAmount, setNextBetAmount, userAction, setUserAction, result, setResult, profitLoss, setProfitLoss, notes, setNotes, onLog, canLog }: { betAmount: number; setBetAmount: (value: number) => void; nextBetAmount: number; setNextBetAmount: (value: number) => void; userAction: BlackjackAction; setUserAction: (value: BlackjackAction) => void; result: HandResult; setResult: (value: HandResult) => void; profitLoss: number; setProfitLoss: (value: number) => void; notes: string; setNotes: (value: string) => void; onLog: () => void; canLog: boolean }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-charcoal/80 p-6">
      <p className="text-sm font-black uppercase tracking-[0.28em] text-gold">Log hand</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <NumberField label="Bet amount" value={betAmount} onChange={setBetAmount} />
        <NumberField label="Next bet check" value={nextBetAmount} onChange={setNextBetAmount} />
        <SelectField label="User action taken" value={userAction} values={actions} onChange={setUserAction} />
        <SelectField label="Result" value={result} values={results} onChange={setResult} />
        <NumberField label="Profit / loss" value={profitLoss} onChange={setProfitLoss} />
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold" placeholder="Emotions, table conditions, mistake reason..." />
      </label>
      <button type="button" disabled={!canLog} onClick={onLog} className="mt-4 w-full rounded-2xl bg-gold px-5 py-4 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">
        Log manual hand result
      </button>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold" />
    </label>
  );
}

function SelectField<T extends string>({ label, value, values, onChange }: { label: string; value: T; values: T[]; onChange: (value: T) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-gold">
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return <div className="rounded-3xl border border-white/10 bg-charcoal/80 p-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-2 text-3xl font-black ${danger ? "text-red-300" : "text-gold"}`}>{value}</p></div>;
}

function SafetyCard() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/50 p-6">
      <p className="text-sm font-black uppercase tracking-[0.28em] text-gold">Safety boundaries</p>
      <ul className="mt-4 space-y-3 text-zinc-300">
        <li>No Stake or gambling website connection.</li>
        <li>No casino login storage.</li>
        <li>No scraping, OCR, browser control, auto-clicking, or auto-betting.</li>
        <li>Only local manual cards, results, and settings are stored.</li>
      </ul>
    </div>
  );
}
