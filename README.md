# Blackjack Discipline Assistant

A safe, manual-only web app for blackjack basic strategy, bankroll limits, and discipline tracking.

## Safety boundary

This app is deliberately **not** a gambling integration.

- Does not connect to Stake or any gambling website
- Does not store casino login details
- Does not scrape websites
- Does not read live screens or use OCR
- Does not auto-click, auto-bet, or control a browser
- Stores only local manual session data and app settings

## Features

- Deterministic blackjack basic strategy engine for hard totals, soft totals, pairs, surrender, H17/S17, decks, payout, DAS, and surrender settings
- Manual card entry with large rank buttons and split-hand flow support
- Large color-coded recommendation panel: Hit, Stand, Double, Split, Surrender
- Bankroll rules: stop-loss, profit target, losing streak break, aggression mode, strategy mistake warnings, max hands, max duration
- Session tracker with bet, cards, dealer card, recommended action, user action, result, P/L, and notes
- History and reports with strategy accuracy, mistake patterns, aggression triggers, and CSV export
- Optional OpenRouter explanation route that can only explain the deterministic decision and cannot override it
- Dark premium responsive UI with gold highlights

## Responsible gambling disclaimer

“This tool is for discipline, education, and bankroll control only. It does not guarantee profit. Blackjack and casino games have a house edge. Never gamble with money you cannot afford to lose.”

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Local storage
- Vitest

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.js.

## Environment variables

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

OpenRouter is optional. If `OPENROUTER_API_KEY` is unset or the API fails, the app shows a local fallback explanation based on the deterministic strategy engine.

The API key must stay in environment variables only. Do not commit it and do not store it in browser local storage.

## Scripts

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm start
```

## Strategy settings seed

Default settings are defined in `src/lib/blackjack.ts`:

- Dealer hits soft 17: yes
- Decks: 6
- Blackjack payout: 3:2
- Double after split: yes
- Surrender allowed: yes

## Manual test checklist

1. Start a session with bankroll, base bet, max bet, stop-loss, profit target, hand limit, and time limit.
2. Enter player `5 + 6`, dealer `6`; verify recommendation is `Double`.
3. Enter player `10 + 6`, dealer `10`, surrender enabled; verify recommendation is `Surrender`.
4. Enter player `A + 6`, dealer `5`; verify recommendation is `Double`.
5. Enter player `8 + 8`, dealer `10`; verify recommendation is `Split`; start split flow and add cards to each split hand.
6. Log three losing hands; verify `TAKE A BREAK` warning.
7. Reach stop-loss; verify full-screen `STOP SESSION` warning.
8. Reach profit target; verify full-screen `LOCK PROFIT` warning.
9. Increase next bet after a loss; verify `AGGRESSION MODE DETECTED`.
10. Choose a user action different from the recommendation repeatedly; verify discipline warning.
11. End the session; verify it appears in History and Reports.
12. Export CSV from History.
13. Enable OpenRouter explanations without an API key; verify fallback explanation appears.

## Screenshots

Screenshots are captured in `public/screenshots/` when running the manual verification flow.

## Deployment

The app is deployable anywhere that supports Next.js builds:

```bash
npm run build
npm start
```

Captured verification screenshots:

- `public/screenshots/start-session.png`
- `public/screenshots/dashboard-recommendation.png`
- `public/screenshots/history.png`
- `public/screenshots/reports.png`
- `public/screenshots/settings.png`
