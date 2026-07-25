import { afterEach, describe, expect, it, vi } from "vitest";
import { adminUsageReport, evaluateAlerts, morningSummary } from "../src/alerts.js";
import { setClock } from "../src/clock.js";
import type { UserProfile, WatchlistItem } from "../src/domain.js";

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  telegramId: 1,
  timezone: "UTC",
  quietHours: { start: 0, end: 0 },
  summaryTime: "09:00",
  summaryEnabled: true,
  cooldownSetting: 300_000,
  ...overrides,
});

const item = (): WatchlistItem => ({
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  alertTypes: ["percent"],
  percentWindow: 3,
  lastPrice: 100,
});

afterEach(() => {
  setClock(() => new Date());
  vi.unstubAllGlobals();
});

describe("scheduled alerts", () => {
  it("delivers a percent alert once during the five-minute cooldown", async () => {
    setClock(() => new Date("2026-01-01T09:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 105, usd_24h_change: 2 } }), { status: 200 })));
    const events = [];
    const watch = [item()];
    expect(await evaluateAlerts(profile(), watch, events)).toHaveLength(1);
    expect(await evaluateAlerts(profile(), watch, events)).toHaveLength(0);
  });

  it("suppresses alerts in the user's quiet hours", async () => {
    setClock(() => new Date("2026-01-01T23:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    expect(await evaluateAlerts(profile({ quietHours: { start: 22, end: 7 } }), [item()], [])).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("formats a scheduled morning summary with current prices", async () => {
    setClock(() => new Date("2026-01-01T09:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 101, usd_24h_change: 1.25 } }), { status: 200 })));
    await expect(morningSummary(profile(), [item()])).resolves.toBe("Morning market summary:\nBTC $101.00 (+1.25%)");
  });

  it("formats the admin usage report", () => {
    expect(adminUsageReport([profile(), profile({ telegramId: 2, summaryEnabled: false })], 3)).toBe("Usage report\nActive users: 2\nWatchlist alerts: 3\nMorning summaries: 1");
  });
});
