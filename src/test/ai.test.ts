import { describe, expect, it } from "vitest";
import { fallbackExplanation } from "@/lib/ai";
import { recommendAction } from "@/lib/blackjack";

describe("AI explanation fallback", () => {
  it("uses deterministic recommendation when API is unavailable", () => {
    const recommendation = recommendAction(["5", "6"], "6");
    const explanation = fallbackExplanation(recommendation);
    expect(explanation).toContain("Recommended action: Double");
    expect(explanation).toContain("deterministic strategy result");
  });
});
