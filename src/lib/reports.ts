import type { BlackjackSession } from "./bankroll";
import { calculateStats } from "./bankroll";

export interface ReportSummary {
  totalProfitLoss: number;
  totalHands: number;
  strategyAccuracy: number;
  biggestMistakePatterns: string[];
  aggressionTriggers: string[];
}

export function buildReportSummary(sessions: BlackjackSession[]): ReportSummary {
  const allHands = sessions.flatMap((session) => session.hands);
  const totalProfitLoss = allHands.reduce((sum, hand) => sum + hand.profitLoss, 0);
  const mistakes = allHands.filter((hand) => hand.userAction !== hand.recommendedAction);
  const patternCounts = new Map<string, number>();
  const triggerCounts = new Map<string, number>();

  for (const hand of mistakes) {
    const key = `${hand.userAction} instead of ${hand.recommendedAction}`;
    patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
  }

  for (const session of sessions) {
    session.hands.forEach((hand, index) => {
      const previous = session.hands[index - 1];
      if (previous?.result === "loss" && hand.betAmount > previous.betAmount) {
        const key = `Raised from ${previous.betAmount} to ${hand.betAmount} after a loss`;
        triggerCounts.set(key, (triggerCounts.get(key) ?? 0) + 1);
      }
    });
  }

  return {
    totalProfitLoss,
    totalHands: allHands.length,
    strategyAccuracy: allHands.length === 0 ? 100 : Math.round(((allHands.length - mistakes.length) / allHands.length) * 100),
    biggestMistakePatterns: [...patternCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pattern, count]) => `${pattern} (${count})`),
    aggressionTriggers: [...triggerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pattern, count]) => `${pattern} (${count})`),
  };
}

export function sessionCards(session: BlackjackSession): { label: string; value: string | number }[] {
  const stats = calculateStats(session);
  return [
    { label: "P/L", value: stats.profitLoss },
    { label: "Hands", value: stats.totalHands },
    { label: "Accuracy", value: `${stats.strategyAccuracy}%` },
    { label: "Loss streak", value: stats.biggestLossStreak },
  ];
}
