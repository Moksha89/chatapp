import type { BlackjackAction } from "@/lib/blackjack";

const styles: Record<BlackjackAction, string> = {
  Hit: "border-blue-400/50 bg-blue-500/20 text-blue-100",
  Stand: "border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
  Double: "border-gold/60 bg-gold/20 text-gold",
  Split: "border-purple-400/50 bg-purple-500/20 text-purple-100",
  Surrender: "border-red-400/50 bg-red-500/20 text-red-100",
};

export function ActionBadge({ action, large = false }: { action: BlackjackAction; large?: boolean }) {
  return <span className={`inline-flex items-center justify-center rounded-2xl border font-black uppercase tracking-[0.18em] ${styles[action]} ${large ? "px-8 py-5 text-4xl sm:text-6xl" : "px-3 py-1 text-xs"}`}>{action}</span>;
}
