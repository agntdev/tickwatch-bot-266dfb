import { now } from "./clock.js";
import type { AlertEvent, UserProfile, WatchlistItem } from "./domain.js";
import { inQuietHours } from "./domain.js";
import { money, quoteCoin } from "./prices.js";

export interface AlertDelivery {
  coinId: string;
  text: string;
  event: AlertEvent;
}

/**
 * Evaluate a user's watchlist. The caller persists returned item/event updates
 * in the same durable user record and sends messages only after this succeeds.
 */
export async function evaluateAlerts(
  profile: UserProfile,
  items: WatchlistItem[],
  events: AlertEvent[],
): Promise<AlertDelivery[]> {
  const current = now();
  if (inQuietHours(profile, current)) return [];
  const deliveries: AlertDelivery[] = [];
  for (const item of items) {
    try {
      const quote = await quoteCoin(item.coinId);
      const previous = item.lastPrice;
      item.lastPrice = quote.usd;
      if (previous === undefined) continue;
      const change = ((quote.usd - previous) / previous) * 100;
      const conditions: string[] = [];
      if (item.alertTypes.includes("percent") && Math.abs(change) >= item.percentWindow) conditions.push(`${item.percentWindow}% move`);
      if (item.alertTypes.includes("threshold") && item.threshold !== undefined && ((previous < item.threshold && quote.usd >= item.threshold) || (previous > item.threshold && quote.usd <= item.threshold))) conditions.push("price threshold");
      for (const condition of conditions) {
        const duplicate = events.some((event) => event.coinId === item.coinId && event.condition === condition && current.getTime() - new Date(event.timestamp).getTime() < profile.cooldownSetting);
        if (duplicate) continue;
        const event = { coinId: item.coinId, condition, oldPrice: previous, newPrice: quote.usd, timestamp: current.toISOString() };
        events.push(event);
        deliveries.push({ coinId: item.coinId, event, text: `${item.name} alert: ${condition}.\n${money(previous)} → ${money(quote.usd)}.` });
      }
    } catch {
      // A later scheduled run silently retries an unavailable feed.
    }
  }
  return deliveries;
}

export async function morningSummary(profile: UserProfile, items: WatchlistItem[]): Promise<string | undefined> {
  const current = now();
  if (!profile.summaryEnabled || inQuietHours(profile, current) || !atSummaryTime(profile, current) || items.length === 0) return undefined;
  const lines: string[] = [];
  for (const item of items) {
    try {
      const quote = await quoteCoin(item.coinId);
      lines.push(`${item.symbol.toUpperCase()} ${money(quote.usd)} (${quote.change24h >= 0 ? "+" : ""}${quote.change24h.toFixed(2)}%)`);
    } catch {
      // Omit a failed quote instead of making the whole digest fail.
    }
  }
  return lines.length ? `Morning market summary:\n${lines.join("\n")}` : undefined;
}

function atSummaryTime(profile: UserProfile, at: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: profile.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return `${hour}:${minute}` === profile.summaryTime;
}

export function adminUsageReport(profiles: UserProfile[], itemCount: number): string {
  const summaries = profiles.filter((profile) => profile.summaryEnabled).length;
  return `Usage report\nActive users: ${profiles.length}\nWatchlist alerts: ${itemCount}\nMorning summaries: ${summaries}`;
}
