import type { StrategyRecommendation } from "./blackjack";

export function fallbackExplanation(recommendation: StrategyRecommendation): string {
  return `${recommendation.reason} This explanation is generated locally from the deterministic strategy result. Follow strategy, not emotion.`;
}

export interface ExplanationRequest {
  recommendation: StrategyRecommendation;
  playerCards: string[];
  dealerCard?: string;
}
