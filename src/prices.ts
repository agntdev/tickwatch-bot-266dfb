export interface CoinMatch { id: string; symbol: string; name: string }
export interface PriceQuote { usd: number; change24h: number }

const COINGECKO = "https://api.coingecko.com/api/v3";

async function json(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("price feed unavailable");
  return response.json();
}

export async function findCoins(ticker: string): Promise<CoinMatch[]> {
  const data = await json(`${COINGECKO}/search?query=${encodeURIComponent(ticker)}`) as { coins?: CoinMatch[] };
  const needle = ticker.trim().toLowerCase();
  return (data.coins ?? [])
    .filter((coin) => coin.id && coin.symbol && coin.name)
    .sort((a, b) => Number(b.symbol.toLowerCase() === needle) - Number(a.symbol.toLowerCase() === needle))
    .slice(0, 5);
}

export async function quoteCoin(coinId: string): Promise<PriceQuote> {
  try {
    const data = await json(`${COINGECKO}/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true`) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const entry = data[coinId];
    if (typeof entry?.usd === "number") return { usd: entry.usd, change24h: entry.usd_24h_change ?? 0 };
  } catch {
    // Binance is a public secondary feed. It only accepts symbols, so it is used
    // by the caller when a ticker is available rather than guessing a coin id.
  }
  throw new Error("price unavailable");
}

export async function quoteTicker(symbol: string): Promise<PriceQuote> {
  try {
    const match = (await findCoins(symbol)).find((coin) => coin.symbol.toLowerCase() === symbol.toLowerCase());
    if (match) return await quoteCoin(match.id);
  } catch {
    // Continue to Binance when CoinGecko is rate-limited or unavailable.
  }
  const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol.toUpperCase() + "USDT")}`);
  if (!response.ok) throw new Error("price unavailable");
  const data = await response.json() as { lastPrice?: string; priceChangePercent?: string };
  const usd = Number(data.lastPrice);
  if (!Number.isFinite(usd)) throw new Error("price unavailable");
  return { usd, change24h: Number(data.priceChangePercent) || 0 };
}

export function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);
}
