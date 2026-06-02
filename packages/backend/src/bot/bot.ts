/**
 * Telegram bot — entry point.
 *
 * Creates the bot, attaches middleware that injects the DB user into every
 * handler's context, registers all command/callback handlers, and exports
 * a startBot() function that index.ts calls alongside Express.
 *
 * Development: long polling (no webhook needed — bot connects out to Telegram)
 * Production: swap bot.start() for webhook via bot.init() + webhookCallback()
 */

import { Bot, Context } from "grammy";
import prisma from "../lib/prisma.js";
import { registerUserHandlers } from "./handlers/user.js";
import { registerAdminHandlers } from "./handlers/admin.js";

// ── Extended context ──────────────────────────────────────────────────────────

/**
 * The DB User row, attached to every context by the user-injection middleware.
 * Handlers read ctx.dbUser instead of hitting the DB themselves.
 */
export type DbUser = {
  id: number;
  telegramId: bigint;
  firstName: string;
  lastName: string | null;
  username: string | null;
};

/** Every handler receives this extended context. */
export type BotContext = Context & {
  dbUser?: DbUser;
};

// ── Admin check ───────────────────────────────────────────────────────────────

/**
 * Returns true if the message sender is the configured admin.
 * Set ADMIN_TELEGRAM_ID in .env to your Telegram numeric user ID.
 * (Get it by messaging @userinfobot on Telegram.)
 */
export function isAdmin(ctx: BotContext): boolean {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId || !ctx.from) return false;
  return String(ctx.from.id) === adminId.trim();
}

// ── Bot factory ───────────────────────────────────────────────────────────────

export function createBot(): Bot<BotContext> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

  const bot = new Bot<BotContext>(token);

  // ── Middleware: upsert DB user on every interaction ─────────────────────────
  //
  // Why upsert vs findUnique?
  //   The bot may encounter new users at any time (someone forwarding the bot
  //   to a friend). Upsert handles both "first time" and "returning user"
  //   in one DB round-trip, and keeps firstName/username in sync.
  //
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      ctx.dbUser = await prisma.user.upsert({
        where: { telegramId: BigInt(ctx.from.id) },
        update: {
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name ?? null,
          username: ctx.from.username ?? null,
        },
        create: {
          telegramId: BigInt(ctx.from.id),
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name ?? null,
          username: ctx.from.username ?? null,
        },
      });
    }
    await next();
  });

  // ── Register handlers ───────────────────────────────────────────────────────
  registerUserHandlers(bot);   // /start → opens Mini App
  registerAdminHandlers(bot);  // /pending + approve/reject callbacks

  // ── Global error handler ────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error("[Bot error]", err.ctx?.update?.update_id, err.message);
  });

  return bot;
}

// ── Start (long polling for development) ─────────────────────────────────────

export function startBot(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.");
    return;
  }

  const bot = createBot();

  // bot.start() runs the long-polling loop in the background.
  // It does not block — Express continues to listen on its port.
  bot.start({
    onStart: (info) =>
      console.log(`Telegram bot @${info.username} started (long polling).`),
  }).catch((err) => {
    console.error("Telegram bot crashed:", err.message);
  });
}
