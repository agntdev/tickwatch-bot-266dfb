import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { quoteTicker, money } from "../prices.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.

const composer = new Composer<Ctx>();

composer.command("price", async (ctx) => {
  const ticker = ctx.match?.trim();
  if (!ticker) {
    await ctx.reply("Send a ticker with the command, for example /price BTC.");
    return;
  }
  if (!/^[a-zA-Z0-9]{2,15}$/.test(ticker)) {
    await ctx.reply("That ticker doesn’t look valid. Try a symbol like BTC.");
    return;
  }
  try {
    const quote = await quoteTicker(ticker);
    const sign = quote.change24h >= 0 ? "+" : "";
    await ctx.reply(`${ticker.toUpperCase()} is ${money(quote.usd)}.\n24h change: ${sign}${quote.change24h.toFixed(2)}%.`);
  } catch {
    await ctx.reply("Couldn’t reach a price feed for that ticker. Check the symbol and try again.");
  }
});

export default composer;
