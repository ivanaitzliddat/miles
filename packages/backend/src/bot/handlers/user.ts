/**
 * User handlers: /start
 *
 * The bot's main job for regular users is to launch the Mini App.
 * The Mini App handles everything else (wallet, recommendations, transactions).
 */

import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import type { BotContext } from "../bot.js";

export function registerUserHandlers(bot: Bot<BotContext>): void {
  bot.command("start", handleStart);
}

async function handleStart(ctx: BotContext): Promise<void> {
  const name = ctx.dbUser?.firstName ?? "there";

  // The Mini App URL comes from MINI_APP_URL in .env.
  // During development this can be left blank — the button just won't appear.
  const miniAppUrl = process.env.MINI_APP_URL;

  const keyboard = miniAppUrl
    ? new InlineKeyboard().webApp("Open Miles Tracker", miniAppUrl)
    : undefined;

  await ctx.reply(
    `👋 <b>Welcome, ${name}!</b>\n\n` +
    `Miles Tracker helps you always reach for the right card — ` +
    `tracking your monthly caps so you earn the most miles on every spend.\n\n` +
    (miniAppUrl
      ? `Tap the button below to open the app.`
      : `The app will be available here once it's deployed.`),
    { parse_mode: "HTML", reply_markup: keyboard }
  );
}
