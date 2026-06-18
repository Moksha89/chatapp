import type { BlackjackSession, SessionConfig } from "./bankroll";
import type { GameRules } from "./blackjack";
import { defaultSessionConfig } from "./bankroll";
import { defaultRules } from "./blackjack";

const activeSessionKey = "blackjack-discipline-active-session";
const sessionsKey = "blackjack-discipline-sessions";
const settingsKey = "blackjack-discipline-settings";

export interface StoredSettings {
  rules: GameRules;
  sessionConfig: SessionConfig;
  aiExplanationEnabled: boolean;
}

export const defaultSettings: StoredSettings = {
  rules: defaultRules,
  sessionConfig: defaultSessionConfig,
  aiExplanationEnabled: false,
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSettings(): StoredSettings {
  const settings = readJson<StoredSettings>(settingsKey, defaultSettings);
  return {
    ...defaultSettings,
    ...settings,
    rules: { ...defaultRules, ...settings.rules },
    sessionConfig: { ...defaultSessionConfig, ...settings.sessionConfig },
  };
}

export function saveSettings(settings: StoredSettings): void {
  writeJson(settingsKey, settings);
}

export function getActiveSession(): BlackjackSession | undefined {
  return readJson<BlackjackSession | undefined>(activeSessionKey, undefined);
}

export function saveActiveSession(session: BlackjackSession | undefined): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(activeSessionKey);
    return;
  }
  writeJson(activeSessionKey, session);
}

export function getSessionHistory(): BlackjackSession[] {
  return readJson<BlackjackSession[]>(sessionsKey, []);
}

export function saveSessionHistory(sessions: BlackjackSession[]): void {
  writeJson(sessionsKey, sessions);
}

export function archiveSession(session: BlackjackSession): BlackjackSession[] {
  const endedSession = { ...session, endedAt: session.endedAt ?? new Date().toISOString() };
  const sessions = [endedSession, ...getSessionHistory().filter((item) => item.id !== session.id)];
  saveSessionHistory(sessions);
  saveActiveSession(undefined);
  return sessions;
}
