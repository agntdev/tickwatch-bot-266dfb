import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { itemsFor, resetFlow } from "../domain.js";
import { findCoins } from "../prices.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Add coin", data: "watchlist:add", order: 10 });

const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_ticker";
  await ctx.reply("Send the ticker you want to track, such as BTC.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Type a ticker" },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_ticker") return next();
  const ticker = ctx.message.text.trim();
  if (!/^[a-zA-Z0-9]{2,30}$/.test(ticker)) {
    await ctx.reply("Send a ticker with letters or numbers, such as BTC.");
    return;
  }
  try {
    const coins = await findCoins(ticker);
    if (coins.length === 0) {
      await ctx.reply("Couldn’t find that ticker. Check the spelling and try again.");
      return;
    }
    await ctx.reply("Choose the coin to track.", {
      reply_markup: inlineKeyboard([
        ...coins.map((coin) => [inlineButton(`${coin.name} (${coin.symbol.toUpperCase()})`, `coin:${coin.id}`)]),
        [inlineButton("Cancel", "flow:cancel")],
      ]),
    });
  } catch {
    await ctx.reply("Price search is temporarily unavailable. Try again in a moment.");
  }
});

composer.callbackQuery(/^coin:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coinId = ctx.match[1];
  // Resolve the id again so callback data can never create a fabricated coin.
  try {
    const coin = (await findCoins(coinId)).find((candidate) => candidate.id === coinId);
    if (!coin) {
      await ctx.reply("That coin is no longer available. Search for it again.");
      return;
    }
    ctx.session.pendingCoin = { coinId: coin.id, symbol: coin.symbol, name: coin.name, alertTypes: [], percentWindow: 5 };
    ctx.session.pendingTypes = [];
    ctx.session.step = "choosing_types";
    await ctx.editMessageText("Choose the alerts you want. You can select both, then continue.", {
      reply_markup: typeKeyboard([]),
    });
  } catch {
    await ctx.reply("Price search is temporarily unavailable. Try again in a moment.");
  }
});

function typeKeyboard(selected: string[]) {
  const has = (value: string) => selected.includes(value) ? "Selected" : "Add";
  return inlineKeyboard([
    [inlineButton(`${has("threshold")} price threshold`, "atype:threshold")],
    [inlineButton(`${has("percent")} percent change`, "atype:percent")],
    [inlineButton("Continue", "atype:next")],
    [inlineButton("Cancel", "flow:cancel")],
  ]);
}

composer.callbackQuery(/^atype:(threshold|percent)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.session.pendingCoin) return;
  const type = ctx.match[1] as "threshold" | "percent";
  const selected = ctx.session.pendingTypes ?? [];
  ctx.session.pendingTypes = selected.includes(type) ? selected.filter((value) => value !== type) : [...selected, type];
  await ctx.editMessageReplyMarkup({ reply_markup: typeKeyboard(ctx.session.pendingTypes) });
});

composer.callbackQuery("atype:next", async (ctx) => {
  await ctx.answerCallbackQuery();
  const coin = ctx.session.pendingCoin;
  const types = ctx.session.pendingTypes ?? [];
  if (!coin || types.length === 0) {
    await ctx.reply("Choose at least one alert type before continuing.");
    return;
  }
  coin.alertTypes = types;
  if (types.includes("threshold")) {
    ctx.session.step = "awaiting_threshold";
    await ctx.editMessageText("Send the USD price that should trigger your threshold alert.", {
      reply_markup: inlineKeyboard([[inlineButton("Cancel", "flow:cancel")]]),
    });
    return;
  }
  await chooseWindow(ctx);
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_threshold") return next();
  const threshold = Number(ctx.message.text.trim().replace(/[$,]/g, ""));
  if (!Number.isFinite(threshold) || threshold <= 0) {
    await ctx.reply("Send a positive USD price, such as 65000.");
    return;
  }
  if (!ctx.session.pendingCoin) return;
  ctx.session.pendingCoin.threshold = threshold;
  await chooseWindow(ctx);
});

async function chooseWindow(ctx: Ctx): Promise<void> {
  ctx.session.step = "choosing_types";
  await ctx.reply("Choose the percent-change window for this alert.", {
    reply_markup: inlineKeyboard([
      [1, 3, 5, 10].map((value) => inlineButton(`${value}%`, `window:${value}`)),
      [inlineButton("Cancel", "flow:cancel")],
    ]),
  });
}

composer.callbackQuery(/^window:(1|3|5|10)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coin = ctx.session.pendingCoin;
  if (!coin) return;
  coin.percentWindow = Number(ctx.match[1]);
  const list = itemsFor(ctx);
  const existing = list.findIndex((item) => item.coinId === coin.coinId);
  if (existing >= 0) list[existing] = coin;
  else list.push(coin);
  resetFlow(ctx.session);
  await ctx.editMessageText(`${coin.name} is now on your watchlist. Alerts use a 5-minute cooldown.`, {
    reply_markup: inlineKeyboard([[inlineButton("Edit watchlist", "watchlist:edit"), inlineButton("Add another", "watchlist:add")]]),
  });
});

composer.callbackQuery("flow:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  resetFlow(ctx.session);
  await ctx.editMessageText("No changes were made.");
});

export default composer;
