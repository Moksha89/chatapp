import { describe, expect, it } from "vitest";
import { calculateStats, evaluateDiscipline, type BlackjackSession, type HandLog } from "@/lib/bankroll";
import { defaultRules } from "@/lib/blackjack";

const baseSession: BlackjackSession = {
  id: "session-1",
  startedAt: new Date().toISOString(),
  config: {
    startingBankroll: 1000,
    sessionBudget: 200,
    baseBet: 10,
    maximumBet: 50,
    stopLossAmount: 30,
    profitTarget: 40,
    maxHands: 20,
    maxSessionMinutes: 60,
  },
  rules: defaultRules,
  hands: [],
};

function hand(id: number, profitLoss: number, result: "win" | "loss" | "push" | "blackjack" = profitLoss < 0 ? "loss" : "win", betAmount = 10): HandLog {
  return {
    id: `hand-${id}`,
    handNumber: id,
    createdAt: new Date().toISOString(),
    betAmount,
    playerCards: ["10", "6"],
    dealerCard: "10",
    recommendedAction: "Hit",
    userAction: "Hit",
    result,
    profitLoss,
    notes: "",
  };
}

describe("bankroll discipline manager", () => {
  it("triggers bankroll stop-loss", () => {
    const session = { ...baseSession, hands: [hand(1, -10), hand(2, -10), hand(3, -10)] };
    expect(evaluateDiscipline(session).stopSession).toBe(true);
    expect(evaluateDiscipline(session).messages[0]).toContain("STOP SESSION");
  });

  it("triggers profit target", () => {
    const session = { ...baseSession, hands: [hand(1, 20), hand(2, 20)] };
    expect(evaluateDiscipline(session).lockProfit).toBe(true);
  });

  it("triggers losing streak break warning", () => {
    const session = { ...baseSession, hands: [hand(1, -10), hand(2, -10), hand(3, -10)] };
    expect(calculateStats(session).currentLosingStreak).toBe(3);
    expect(evaluateDiscipline(session).takeBreak).toBe(true);
  });

  it("detects aggression mode when next bet increases after a loss", () => {
    const session = { ...baseSession, hands: [hand(1, -10, "loss", 10)] };
    expect(evaluateDiscipline(session, 25).aggressionMode).toBe(true);
  });

  it("counts strategy mistakes", () => {
    const badHand = { ...hand(1, -10), userAction: "Stand" as const };
    const session = { ...baseSession, hands: [badHand] };
    expect(calculateStats(session).strategyMistakes).toBe(1);
    expect(calculateStats(session).strategyAccuracy).toBe(0);
  });
});
