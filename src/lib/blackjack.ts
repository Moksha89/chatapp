export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type BlackjackAction = "Hit" | "Stand" | "Double" | "Split" | "Surrender";

export type BlackjackPayout = "3:2" | "6:5";

export interface GameRules {
  dealerHitsSoft17: boolean;
  decks: 1 | 2 | 4 | 6 | 8;
  blackjackPayout: BlackjackPayout;
  doubleAfterSplit: boolean;
  surrenderAllowed: boolean;
}

export interface HandAnalysis {
  total: number;
  hardTotal: number;
  isSoft: boolean;
  isPair: boolean;
  pairRank?: Rank;
  label: string;
}

export interface StrategyRecommendation {
  action: BlackjackAction;
  confidence: "Best mathematical move";
  reason: string;
  warning?: string;
  hand: HandAnalysis;
}

export const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const defaultRules: GameRules = {
  dealerHitsSoft17: true,
  decks: 6,
  blackjackPayout: "3:2",
  doubleAfterSplit: true,
  surrenderAllowed: true,
};

const dealerLabels: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10-value card",
  11: "Ace",
};

function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return Number(rank);
}

function hardCardValue(rank: Rank): number {
  if (rank === "A") return 1;
  return cardValue(rank);
}

function dealerValue(rank: Rank): number {
  return rank === "A" ? 11 : cardValue(rank);
}

function isTenValue(rank: Rank): boolean {
  return cardValue(rank) === 10;
}

function pairRank(cards: Rank[]): Rank | undefined {
  if (cards.length !== 2) return undefined;
  if (cards[0] === cards[1]) return cards[0];
  if (isTenValue(cards[0]) && isTenValue(cards[1])) return "10";
  return undefined;
}

export function analyzeHand(cards: Rank[]): HandAnalysis {
  const hardTotal = cards.reduce((sum, rank) => sum + hardCardValue(rank), 0);
  const aces = cards.filter((rank) => rank === "A").length;
  let total = hardTotal;
  let softAces = 0;

  for (let index = 0; index < aces; index += 1) {
    if (total + 10 <= 21) {
      total += 10;
      softAces += 1;
    }
  }

  const pair = pairRank(cards);
  const labelPrefix = pair ? `Pair of ${pair}s` : softAces > 0 ? `Soft ${total}` : `Hard ${total}`;

  return {
    total,
    hardTotal,
    isSoft: softAces > 0,
    isPair: pair !== undefined,
    pairRank: pair,
    label: labelPrefix,
  };
}

function maybeDouble(action: BlackjackAction, canDouble: boolean): BlackjackAction {
  return action === "Double" && !canDouble ? "Hit" : action;
}

function makeReason(action: BlackjackAction, hand: HandAnalysis, dealer: number, detail: string): string {
  return `${hand.label} against dealer ${dealerLabels[dealer]}: ${detail} Recommended action: ${action}.`;
}

function surrenderAction(hardTotal: number, dealer: number, rules: GameRules): BlackjackAction | undefined {
  if (!rules.surrenderAllowed) return undefined;
  if (hardTotal === 16 && [9, 10, 11].includes(dealer)) return "Surrender";
  if (hardTotal === 15 && dealer === 10) return "Surrender";
  if (rules.dealerHitsSoft17 && hardTotal === 15 && dealer === 11) return "Surrender";
  if (rules.dealerHitsSoft17 && hardTotal === 17 && dealer === 11) return "Surrender";
  return undefined;
}

function pairAction(pair: Rank, dealer: number, rules: GameRules, canSplit: boolean, canDouble: boolean): BlackjackAction | undefined {
  if (!canSplit) return undefined;
  if (pair === "A" || pair === "8") return "Split";
  if (isTenValue(pair)) return "Stand";
  if (pair === "9") return [2, 3, 4, 5, 6, 8, 9].includes(dealer) ? "Split" : "Stand";
  if (pair === "7") return dealer <= 7 ? "Split" : "Hit";
  if (pair === "6") {
    if (rules.doubleAfterSplit) return dealer <= 6 ? "Split" : "Hit";
    return [3, 4, 5, 6].includes(dealer) ? "Split" : "Hit";
  }
  if (pair === "5") return maybeDouble(dealer <= 9 ? "Double" : "Hit", canDouble);
  if (pair === "4") return rules.doubleAfterSplit && [5, 6].includes(dealer) ? "Split" : "Hit";
  if (pair === "3" || pair === "2") {
    if (rules.doubleAfterSplit) return dealer <= 7 ? "Split" : "Hit";
    return [4, 5, 6, 7].includes(dealer) ? "Split" : "Hit";
  }
  return undefined;
}

function softAction(total: number, dealer: number, rules: GameRules, canDouble: boolean): BlackjackAction {
  if (total <= 14) return maybeDouble([5, 6].includes(dealer) ? "Double" : "Hit", canDouble);
  if (total === 15 || total === 16) return maybeDouble([4, 5, 6].includes(dealer) ? "Double" : "Hit", canDouble);
  if (total === 17) return maybeDouble([3, 4, 5, 6].includes(dealer) ? "Double" : "Hit", canDouble);
  if (total === 18) {
    if ([3, 4, 5, 6].includes(dealer)) return maybeDouble("Double", canDouble);
    if (dealer === 2 || dealer === 7 || dealer === 8) return "Stand";
    return "Hit";
  }
  return "Stand";
}

function hardAction(total: number, dealer: number, rules: GameRules, canDouble: boolean): BlackjackAction {
  const surrender = surrenderAction(total, dealer, rules);
  if (surrender) return surrender;
  if (total <= 8) return "Hit";
  if (total === 9) return maybeDouble([3, 4, 5, 6].includes(dealer) ? "Double" : "Hit", canDouble);
  if (total === 10) return maybeDouble(dealer <= 9 ? "Double" : "Hit", canDouble);
  if (total === 11) {
    if (dealer !== 11 || rules.dealerHitsSoft17) return maybeDouble("Double", canDouble);
    return "Hit";
  }
  if (total === 12) return [4, 5, 6].includes(dealer) ? "Stand" : "Hit";
  if (total >= 13 && total <= 16) return dealer <= 6 ? "Stand" : "Hit";
  return "Stand";
}

function recommendationDetail(action: BlackjackAction, hand: HandAnalysis, dealer: number): string {
  if (action === "Surrender") return "the dealer has a strong up-card and late surrender saves half the bet versus playing a weak total.";
  if (action === "Split") return "separating this pair creates stronger long-term expected value than playing it as one hand.";
  if (action === "Double") return "this is a high-value double spot when you can commit one extra base bet for one card.";
  if (action === "Stand") return dealer <= 6 ? "the dealer is more likely to break, so avoid taking unnecessary cards." : "your made hand is strong enough to hold against the dealer up-card.";
  return dealer >= 7 ? "the dealer pressure is high, so improve the hand instead of standing on a weak total." : "your total is too low to protect, even against a weaker dealer card.";
}

export function recommendAction(
  playerCards: Rank[],
  dealerUpCard?: Rank,
  rules: GameRules = defaultRules,
  options: { canDouble?: boolean; canSplit?: boolean } = {},
): StrategyRecommendation {
  const hand = analyzeHand(playerCards);
  const canDouble = options.canDouble ?? playerCards.length === 2;
  const canSplit = options.canSplit ?? playerCards.length === 2;
  const warning = playerCards.length < 2 || dealerUpCard === undefined ? "Enter at least two player cards and one dealer up-card for a complete recommendation." : undefined;

  if (warning || dealerUpCard === undefined) {
    return {
      action: "Hit",
      confidence: "Best mathematical move",
      reason: "Complete the manual card entry before relying on the recommendation.",
      warning,
      hand,
    };
  }

  const dealer = dealerValue(dealerUpCard);
  let action: BlackjackAction | undefined;

  if (hand.isPair && hand.pairRank) {
    action = pairAction(hand.pairRank, dealer, rules, canSplit, canDouble);
    if (action !== "Split" && action !== "Stand") {
      const surrender = surrenderAction(hand.hardTotal, dealer, rules);
      action = surrender ?? action;
    }
  }

  if (!action) action = hand.isSoft ? softAction(hand.total, dealer, rules, canDouble) : hardAction(hand.total, dealer, rules, canDouble);

  return {
    action,
    confidence: "Best mathematical move",
    reason: makeReason(action, hand, dealer, recommendationDetail(action, hand, dealer)),
    warning: rules.blackjackPayout === "6:5" ? "6:5 blackjack payout worsens expected value. This assistant still uses deterministic basic strategy, not recovery betting." : undefined,
    hand,
  };
}

export function actionMatchesRecommendation(userAction: BlackjackAction, recommendedAction: BlackjackAction): boolean {
  return userAction === recommendedAction;
}
