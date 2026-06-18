import type { BlackjackSession } from "./bankroll";
import { calculateStats } from "./bankroll";

function escapeCsv(value: string | number | undefined): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function sessionsToCsv(sessions: BlackjackSession[]): string {
  const rows: Array<Array<string | number | undefined>> = [
    [
      "session_id",
      "started_at",
      "ended_at",
      "hand_number",
      "bet_amount",
      "player_cards",
      "dealer_card",
      "recommended_action",
      "user_action",
      "result",
      "profit_loss",
      "notes",
      "session_total_pl",
      "strategy_accuracy",
    ],
  ];

  for (const session of sessions) {
    const stats = calculateStats(session);
    if (session.hands.length === 0) {
      rows.push([session.id, session.startedAt, session.endedAt ?? "", "", "", "", "", "", "", "", "", "", stats.profitLoss, `${stats.strategyAccuracy}%`]);
      continue;
    }
    for (const hand of session.hands) {
      rows.push([
        session.id,
        session.startedAt,
        session.endedAt ?? "",
        hand.handNumber,
        hand.betAmount,
        hand.playerCards.join(" "),
        hand.dealerCard ?? "",
        hand.recommendedAction,
        hand.userAction,
        hand.result,
        hand.profitLoss,
        hand.notes,
        stats.profitLoss,
        `${stats.strategyAccuracy}%`,
      ]);
    }
  }

  return rows.map((row) => row.map((value) => escapeCsv(value)).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
