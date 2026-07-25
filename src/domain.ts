import type { Ctx, Session } from "./bot.js";

export type AlertType = "threshold" | "percent";

export interface UserProfile {
  telegramId: number;
  timezone: string;
  quietHours: { start: number; end: number };
  summaryTime: string;
  summaryEnabled: boolean;
  cooldownSetting: number;
}

export interface WatchlistItem {
  coinId: string;
  symbol: string;
  name: string;
  alertTypes: AlertType[];
  percentWindow: number;
  threshold?: number;
  lastPrice?: number;
}

export interface AlertEvent {
  coinId: string;
  condition: string;
  oldPrice: number;
  newPrice: number;
  timestamp: string;
}

export function profileFor(ctx: Ctx): UserProfile {
  const id = ctx.from?.id ?? ctx.chat?.id ?? 0;
  if (!ctx.session.profile) {
    ctx.session.profile = {
      telegramId: id,
      timezone: "UTC",
      quietHours: { start: 22, end: 7 },
      summaryTime: "09:00",
      summaryEnabled: false,
      cooldownSetting: 5 * 60_000,
    };
  }
  return ctx.session.profile;
}

export function itemsFor(ctx: Ctx): WatchlistItem[] {
  if (!ctx.session.watchlist) ctx.session.watchlist = [];
  return ctx.session.watchlist;
}

export function eventsFor(ctx: Ctx): AlertEvent[] {
  if (!ctx.session.alertEvents) ctx.session.alertEvents = [];
  return ctx.session.alertEvents;
}

export function resetFlow(session: Session): void {
  session.step = "idle";
  session.pendingCoin = undefined;
  session.pendingTypes = undefined;
}

export function validTimezone(value: string): string | undefined {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function inQuietHours(profile: UserProfile, at: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: profile.timezone, hour: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .find((part) => part.type === "hour")?.value,
  );
  const { start, end } = profile.quietHours;
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
