import type { BlackjackAction, GameRules, Rank } from "./blackjack";
import { defaultRules } from "./blackjack";

export type HandResult = "win" | "loss" | "push" | "blackjack";

export interface SessionConfig {
  startingBankroll: number;
  sessionBudget: number;
  baseBet: number;
  maximumBet: number;
  stopLossAmount: number;
  profitTarget: number;
  maxHands: number;
  maxSessionMinutes: number;
}

export interface HandLog {
  id: string;
  handNumber: number;
  createdAt: string;
  betAmount: number;
  playerCards: Rank[];
  dealerCard?: Rank;
  recommendedAction: BlackjackAction;
  userAction: BlackjackAction;
  result: HandResult;
  profitLoss: number;
  notes: string;
}

export interface BlackjackSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  config: SessionConfig;
  rules: GameRules;
  hands: HandLog[];
}

export interface SessionStats {
  profitLoss: number;
  totalHands: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  currentLosingStreak: number;
  biggestLossStreak: number;
  strategyMistakes: number;
  strategyAccuracy: number;
  remainingLossLimit: number;
  remainingProfitTarget: number;
  remainingHands: number;
  elapsedMinutes: number;
  remainingMinutes: number;
}

export interface DisciplineWarnings {
  stopSession: boolean;
  lockProfit: boolean;
  takeBreak: boolean;
  aggressionMode: boolean;
  playedAfterStopLoss: boolean;
  repeatedStrategyMistakes: boolean;
  maxHandsReached: boolean;
  maxTimeReached: boolean;
  messages: string[];
}

export const defaultSessionConfig: SessionConfig = {
  startingBankroll: 1000,
  sessionBudget: 200,
  baseBet: 10,
  maximumBet: 50,
  stopLossAmount: 100,
  profitTarget: 120,
  maxHands: 60,
  maxSessionMinutes: 90,
};

export function createSession(config: SessionConfig = defaultSessionConfig, rules: GameRules = defaultRules): BlackjackSession {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    config,
    rules,
    hands: [],
  };
}

export function calculateStats(session: BlackjackSession, now: Date = new Date()): SessionStats {
  const profitLoss = session.hands.reduce((sum, hand) => sum + hand.profitLoss, 0);
  const wins = session.hands.filter((hand) => hand.result === "win").length;
  const losses = session.hands.filter((hand) => hand.result === "loss").length;
  const pushes = session.hands.filter((hand) => hand.result === "push").length;
  const blackjacks = session.hands.filter((hand) => hand.result === "blackjack").length;
  const strategyMistakes = session.hands.filter((hand) => hand.userAction !== hand.recommendedAction).length;
  let currentLosingStreak = 0;
  let biggestLossStreak = 0;
  let runningLossStreak = 0;

  for (const hand of session.hands) {
    if (hand.result === "loss") {
      runningLossStreak += 1;
      biggestLossStreak = Math.max(biggestLossStreak, runningLossStreak);
    } else if (hand.result === "win" || hand.result === "blackjack") {
      runningLossStreak = 0;
    }
  }

  for (let index = session.hands.length - 1; index >= 0; index -= 1) {
    if (session.hands[index].result !== "loss") break;
    currentLosingStreak += 1;
  }

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 60000));
  const totalHands = session.hands.length;

  return {
    profitLoss,
    totalHands,
    wins,
    losses,
    pushes,
    blackjacks,
    currentLosingStreak,
    biggestLossStreak,
    strategyMistakes,
    strategyAccuracy: totalHands === 0 ? 100 : Math.round(((totalHands - strategyMistakes) / totalHands) * 100),
    remainingLossLimit: Math.max(0, session.config.stopLossAmount + profitLoss),
    remainingProfitTarget: Math.max(0, session.config.profitTarget - profitLoss),
    remainingHands: Math.max(0, session.config.maxHands - totalHands),
    elapsedMinutes,
    remainingMinutes: Math.max(0, session.config.maxSessionMinutes - elapsedMinutes),
  };
}

function hadStopLossBeforeLastHand(session: BlackjackSession): boolean {
  if (session.hands.length < 2) return false;
  const priorHands = session.hands.slice(0, -1);
  const priorProfitLoss = priorHands.reduce((sum, hand) => sum + hand.profitLoss, 0);
  return priorProfitLoss <= -session.config.stopLossAmount;
}

export function evaluateDiscipline(session: BlackjackSession, nextBetAmount?: number, now: Date = new Date()): DisciplineWarnings {
  const stats = calculateStats(session, now);
  const lastHand = session.hands.at(-1);
  const aggressionMode = lastHand?.result === "loss" && nextBetAmount !== undefined && nextBetAmount > lastHand.betAmount;
  const repeatedStrategyMistakes = session.hands.slice(-5).filter((hand) => hand.userAction !== hand.recommendedAction).length >= 3;
  const stopSession = stats.profitLoss <= -session.config.stopLossAmount;
  const lockProfit = stats.profitLoss >= session.config.profitTarget;
  const takeBreak = stats.currentLosingStreak >= 3;
  const maxHandsReached = stats.totalHands >= session.config.maxHands;
  const maxTimeReached = stats.elapsedMinutes >= session.config.maxSessionMinutes;
  const messages: string[] = [];

  if (stopSession) messages.push("STOP SESSION: stop-loss reached. Do not chase losses.");
  if (lockProfit) messages.push("LOCK PROFIT / END SESSION: profit target reached.");
  if (takeBreak) messages.push("TAKE A BREAK: three losses in a row detected.");
  if (aggressionMode) messages.push("AGGRESSION MODE DETECTED: bet increased after a loss.");
  if (hadStopLossBeforeLastHand(session)) messages.push("Strong warning: play continued after stop-loss was already reached.");
  if (repeatedStrategyMistakes) messages.push("Discipline warning: repeated deviations from the deterministic strategy engine.");
  if (maxHandsReached) messages.push("Max hand limit reached. End the session.");
  if (maxTimeReached) messages.push("Max session duration reached. End the session.");

  return {
    stopSession,
    lockProfit,
    takeBreak,
    aggressionMode,
    playedAfterStopLoss: hadStopLossBeforeLastHand(session),
    repeatedStrategyMistakes,
    maxHandsReached,
    maxTimeReached,
    messages,
  };
}

export function buildHandLog(input: Omit<HandLog, "id" | "createdAt" | "handNumber">, existingHands: HandLog[]): HandLog {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    handNumber: existingHands.length + 1,
  };
}
