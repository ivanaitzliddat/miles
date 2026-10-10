/**
 * Admin handlers: /pending, approve/reject callbacks.
 *
 * These commands are restricted to the ADMIN_TELEGRAM_ID user in .env.
 * They surface the same admin workflow as the REST API admin routes.
 *
 * /pending         — list all pending rate changes with approve/reject buttons
 * approve:<id>     — callback: approve a pending change
 * reject:<id>      — callback: reject a pending change
 */

import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import type { BotContext } from "../bot.js";
import { isAdmin } from "../bot.js";
import prisma from "../../lib/prisma.js";
import { resolveRateChange } from "../../services/rateChangeReview.js";

export function registerAdminHandlers(bot: Bot<BotContext>): void {
  bot.command("pending", handlePending);
  bot.callbackQuery(/^approve:/, handleApproveCallback);
  bot.callbackQuery(/^reject:/, handleRejectCallback);
}

// ── /pending ──────────────────────────────────────────────────────────────────

async function handlePending(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply("⛔ Admin only.");
    return;
  }

  const pending = await prisma.pendingRateChange.findMany({
    where: { status: "PENDING" },
    include: { card: { select: { fullName: true, bank: true } } },
    orderBy: { detectedAt: "desc" },
  });

  if (pending.length === 0) {
    await ctx.reply("✅ No pending rate changes.");
    return;
  }

  // Send each change as a separate message with its own approve/reject buttons.
  // Why separate messages? Inline keyboards can't span multiple items elegantly,
  // and we want each change to be independently actionable.
  await ctx.reply(
    `📋 ${pending.length} pending rate change${pending.length === 1 ? "" : "s"}`
  );

  for (const change of pending) {
    const keyboard = new InlineKeyboard()
      .text("✅ Approve", `approve:${change.id}`)
      .text("❌ Reject", `reject:${change.id}`);

    const sourceNote = change.sourceUrl ? `\nSource: ${change.sourceUrl}` : "";

    await ctx.reply(
      `${change.card.fullName}\n` +
      `Field: ${change.field}\n` +
      `Rate: ${change.earningRateDescription}\n` +
      `Change: ${change.oldValue} → ${change.newValue}` +
      sourceNote,
      { reply_markup: keyboard }
    );
  }
}

// ── approve:<id> callback ─────────────────────────────────────────────────────

async function handleApproveCallback(ctx: BotContext): Promise<void> {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx) || !ctx.callbackQuery?.data) return;

  const id = Number(ctx.callbackQuery.data.slice("approve:".length));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  try {
    const change = await resolveRateChange(id, "APPROVED", String(ctx.from!.id));
    await ctx.editMessageText(
      `✅ Approved and applied.\n\n${change.card.fullName} · ${change.field}: ${change.oldValue} → ${change.newValue}`
    );
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Could not approve this change.");
  }
}

// ── reject:<id> callback ──────────────────────────────────────────────────────

async function handleRejectCallback(ctx: BotContext): Promise<void> {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx) || !ctx.callbackQuery?.data) return;

  const id = Number(ctx.callbackQuery.data.slice("reject:".length));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  try {
    const change = await resolveRateChange(id, "REJECTED", String(ctx.from!.id));
    await ctx.editMessageText(
      `❌ Rejected; no rate changed.\n\n${change.card.fullName} · ${change.field}: ${change.oldValue} → ${change.newValue}`
    );
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Could not reject this change.");
  }
}
