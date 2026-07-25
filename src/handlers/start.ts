import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { profileFor, validTimezone } from "../domain.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "Track crypto prices and alerts from one private watchlist.";

composer.command("start", async (ctx) => {
  const firstVisit = !ctx.session.profile;
  profileFor(ctx);
  if (firstVisit) {
    ctx.session.step = "awaiting_timezone";
    await ctx.reply("Track prices and alerts from one private watchlist.\n\nSend your timezone, such as Europe/London. Quiet hours default to 22:00–07:00.", {
      reply_markup: inlineKeyboard([[inlineButton("Use UTC", "setup:utc")]]),
    });
    return;
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("setup:utc", async (ctx) => {
  await ctx.answerCallbackQuery();
  profileFor(ctx).timezone = "UTC";
  ctx.session.step = "idle";
  await ctx.editMessageText("Your timezone is UTC. Quiet hours are 22:00–07:00.", { reply_markup: mainMenuKeyboard() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_timezone") return next();
  const timezone = validTimezone(ctx.message.text.trim());
  if (!timezone) {
    await ctx.reply("That timezone wasn’t recognised. Send a name like Europe/London, or tap Use UTC.");
    return;
  }
  profileFor(ctx).timezone = timezone;
  ctx.session.step = "idle";
  await ctx.reply(`Your timezone is ${timezone}. Quiet hours are 22:00–07:00.`, { reply_markup: mainMenuKeyboard() });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
