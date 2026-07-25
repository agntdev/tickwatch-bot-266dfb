import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { profileFor } from "../domain.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Configure alerts", data: "alert:config", order: 30 });
const composer = new Composer<Ctx>();

function configKeyboard(profile: ReturnType<typeof profileFor>) {
  return inlineKeyboard([
    [inlineButton("Quiet hours 22:00–07:00", "quiet:default"), inlineButton("Quiet hours off", "quiet:off")],
    [inlineButton(profile.summaryEnabled ? "Disable morning summary" : "Enable morning summary", "summary:toggle")],
    [inlineButton("Back to menu", "menu:main")],
  ]);
}

function configText(profile: ReturnType<typeof profileFor>): string {
  const quiet = profile.quietHours.start === profile.quietHours.end ? "Off" : `${String(profile.quietHours.start).padStart(2, "0")}:00–${String(profile.quietHours.end).padStart(2, "0")}:00`;
  return `Alerts are set for ${profile.timezone}.\nQuiet hours: ${quiet}.\nMorning summary: ${profile.summaryEnabled ? `on at ${profile.summaryTime}` : "off"}.\nCooldown: 5 minutes.`;
}

composer.callbackQuery("alert:config", async (ctx) => {
  await ctx.answerCallbackQuery();
  const profile = profileFor(ctx);
  await ctx.reply(configText(profile), { reply_markup: configKeyboard(profile) });
});

composer.callbackQuery("quiet:default", async (ctx) => {
  await ctx.answerCallbackQuery();
  const profile = profileFor(ctx);
  profile.quietHours = { start: 22, end: 7 };
  await ctx.editMessageText(configText(profile), { reply_markup: configKeyboard(profile) });
});

composer.callbackQuery("quiet:off", async (ctx) => {
  await ctx.answerCallbackQuery();
  const profile = profileFor(ctx);
  profile.quietHours = { start: 0, end: 0 };
  await ctx.editMessageText(configText(profile), { reply_markup: configKeyboard(profile) });
});

composer.callbackQuery("summary:toggle", async (ctx) => {
  await ctx.answerCallbackQuery();
  const profile = profileFor(ctx);
  profile.summaryEnabled = !profile.summaryEnabled;
  await ctx.editMessageText(configText(profile), { reply_markup: configKeyboard(profile) });
});

export default composer;
