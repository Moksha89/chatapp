import { describe, expect, it } from "vitest";
import { defaultRules, recommendAction } from "@/lib/blackjack";

describe("blackjack strategy engine", () => {
  it("recommends hard hand strategy decisions", () => {
    expect(recommendAction(["10", "6"], "10", { ...defaultRules, surrenderAllowed: false }).action).toBe("Hit");
    expect(recommendAction(["10", "2"], "4").action).toBe("Stand");
    expect(recommendAction(["5", "6"], "6").action).toBe("Double");
  });

  it("recommends soft hand strategy decisions", () => {
    expect(recommendAction(["A", "6"], "5").action).toBe("Double");
    expect(recommendAction(["A", "7"], "9").action).toBe("Hit");
    expect(recommendAction(["A", "8"], "6").action).toBe("Stand");
  });

  it("recommends pair splitting decisions", () => {
    expect(recommendAction(["A", "A"], "9").action).toBe("Split");
    expect(recommendAction(["8", "8"], "10").action).toBe("Split");
    expect(recommendAction(["10", "K"], "6").action).toBe("Stand");
    expect(recommendAction(["2", "2"], "7").action).toBe("Split");
  });

  it("supports surrender rules", () => {
    expect(recommendAction(["10", "6"], "A", { ...defaultRules, surrenderAllowed: true, dealerHitsSoft17: true }).action).toBe("Surrender");
    expect(recommendAction(["10", "6"], "A", { ...defaultRules, surrenderAllowed: false }).action).toBe("Hit");
    expect(recommendAction(["10", "5"], "10", { ...defaultRules, surrenderAllowed: true }).action).toBe("Surrender");
  });
});
