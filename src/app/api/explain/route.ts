import { NextResponse } from "next/server";
import { fallbackExplanation, type ExplanationRequest } from "@/lib/ai";

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

export async function POST(request: Request): Promise<NextResponse<{ explanation: string; source: "openrouter" | "fallback" }>> {
  const body = (await request.json()) as ExplanationRequest;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ explanation: fallbackExplanation(body.recommendation), source: "fallback" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://blackjack-discipline-assistant.local",
        "X-Title": "Blackjack Discipline Assistant",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Explain blackjack basic strategy in simple beginner language. Never change, dispute, or override the provided deterministic action. Do not mention gambling-site automation or recovery betting.",
          },
          {
            role: "user",
            content: `Player cards: ${body.playerCards.join(" ")}. Dealer up-card: ${body.dealerCard ?? "unknown"}. Deterministic action: ${body.recommendation.action}. Deterministic reason: ${body.recommendation.reason}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ explanation: fallbackExplanation(body.recommendation), source: "fallback" });
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ explanation: fallbackExplanation(body.recommendation), source: "fallback" });
    }

    return NextResponse.json({ explanation: content, source: "openrouter" });
  } catch {
    return NextResponse.json({ explanation: fallbackExplanation(body.recommendation), source: "fallback" });
  }
}
