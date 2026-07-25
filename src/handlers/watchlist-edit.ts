import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { itemsFor } from "../domain.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Edit watchlist", data: "watchlist:edit", order: 20 });
const composer = new Composer<Ctx>();

function watchlistKeyboard(ctx: Ctx) {
  return inlineKeyboard([
    ...itemsFor(ctx).map((item) => [inlineButton(`Remove ${item.symbol.toUpperCase()}`, `watch:remove:${item.coinId}`)]),
    [inlineButton("Add coin", "watchlist:add"), inlineButton("Back to menu", "menu:main")],
  ]);
}

composer.callbackQuery("watchlist:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  const items = itemsFor(ctx);
  if (items.length === 0) {
    await ctx.reply("No coins are on your watchlist yet — tap Add coin to create an alert.", {
      reply_markup: inlineKeyboard([[inlineButton("Add coin", "watchlist:add")]]),
    });
    return;
  }
  const lines = items.map((item) => `${item.name}: ${item.alertTypes.join(" + ")}, ${item.percentWindow}% window`);
  await ctx.reply(`Your watchlist:\n${lines.join("\n")}`, { reply_markup: watchlistKeyboard(ctx) });
});

composer.callbackQuery(/^watch:remove:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coinId = ctx.match[1];
  const items = itemsFor(ctx);
  const item = items.find((candidate) => candidate.coinId === coinId);
  if (!item) {
    await ctx.reply("That coin is already gone from your watchlist.");
    return;
  }
  ctx.session.watchlist = items.filter((candidate) => candidate.coinId !== coinId);
  await ctx.editMessageText(`${item.name} was removed from your watchlist.`, { reply_markup: watchlistKeyboard(ctx) });
});

export default composer;
