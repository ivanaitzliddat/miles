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
    `📋 <b>${pending.length} pending rate change${pending.length === 1 ? "" : "s"}</b>`,
    { parse_mode: "HTML" }
  );

  for (const change of pending) {
    const keyboard = new InlineKeyboard()
      .text("✅ Approve", `approve:${change.id}`)
      .text("❌ Reject", `reject:${change.id}`);

    const sourceNote = change.sourceUrl
      ? `\n🔗 <a href="${change.sourceUrl}">Source</a>`
      : "";

    await ctx.reply(
      `<b>${change.card.fullName}</b>\n` +
      `Field: <code>${change.field}</code>\n` +
      `Rate: ${change.earningRateDescription}\n` +
      `Change: <code>${change.oldValue}</code> → <code>${change.newValue}</code>` +
      sourceNote,
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  }
}

// ── approve:<id> callback ─────────────────────────────────────────────────────

async function handleApproveCallback(ctx: BotContext): Promise<void> {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx) || !ctx.callbackQuery?.data) return;

  const id = parseInt(ctx.callbackQuery.data.replace("approve:", ""), 10);
  if (isNaN(id)) return;

  const change = await prisma.pendingRateChange.findUnique({
    where: { id },
    include: { card: { include: { earningRates: true } } },
  });

  if (!change) {
    await ctx.editMessageText("Change not found.");
    return;
  }
  if (change.status !== "PENDING") {
    await ctx.editMessageText(`Already ${change.status.toLowerCase()}.`);
    return;
  }

  // Apply the change to the earning rate in the DB
  if (
    change.field === "milesPerDollar" ||
    change.field === "monthlyCapSgd" ||
    change.field === "minimumMonthlySpendSgd"
  ) {
    const rate = change.card.earningRates.find(
      (r) =>
        r.description === change.earningRateDescription ||
        `${r.spendCategory}${r.paymentMethod ? " · " + r.paymentMethod : ""}` ===
          change.earningRateDescription
    );

    if (rate) {
      const numericValue = parseFloat(change.newValue.replace(/[^0-9.]/g, ""));
      await prisma.earningRate.update({
        where: { id: rate.id },
        data: { [change.field]: isNaN(numericValue) ? null : numericValue },
      });
    }
  }

  // Record in audit trail
  const resolvedBy = ctx.from?.username ?? String(ctx.from?.id ?? "admin");
  await prisma.rateHistory.create({
    data: {
      cardId: change.cardId,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      effectiveDate: new Date(),
      sourceUrl: change.sourceUrl,
      approvedBy: resolvedBy,
    },
  });

  // Restore card to ACTIVE
  await prisma.card.update({
    where: { id: change.cardId },
    data: { status: "ACTIVE", lastVerifiedAt: new Date() },
  });

  // Mark change as resolved
  await prisma.pendingRateChange.update({
    where: { id },
    data: { status: "APPROVED", resolvedAt: new Date(), resolvedBy },
  });

  await ctx.editMessageText(
    `✅ <b>Approved</b> — change applied to DB.\n\n` +
    `${change.card.fullName} · ${change.field}: ${change.oldValue} → ${change.newValue}`,
    { parse_mode: "HTML" }
  );
}

// ── reject:<id> callback ──────────────────────────────────────────────────────

async function handleRejectCallback(ctx: BotContext): Promise<void> {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx) || !ctx.callbackQuery?.data) return;

  const id = parseInt(ctx.callbackQuery.data.replace("reject:", ""), 10);
  if (isNaN(id)) return;

  const change = await prisma.pendingRateChange.findUnique({
    where: { id },
    include: { card: true },
  });

  if (!change) {
    await ctx.editMessageText("Change not found.");
    return;
  }
  if (change.status !== "PENDING") {
    await ctx.editMessageText(`Already ${change.status.toLowerCase()}.`);
    return;
  }

  const resolvedBy = ctx.from?.username ?? String(ctx.from?.id ?? "admin");

  // If no other pending changes for this card, restore it to ACTIVE
  const otherPending = await prisma.pendingRateChange.count({
    where: { cardId: change.cardId, status: "PENDING", id: { not: id } },
  });

  if (otherPending === 0) {
    await prisma.card.update({
      where: { id: change.cardId },
      data: { status: "ACTIVE", lastVerifiedAt: new Date() },
    });
  }

  await prisma.pendingRateChange.update({
    where: { id },
    data: { status: "REJECTED", resolvedAt: new Date(), resolvedBy },
  });

  await ctx.editMessageText(
    `❌ <b>Rejected</b> — no changes applied.\n\n` +
    `${change.card.fullName} · ${change.field}: ${change.oldValue} → ${change.newValue}`,
    { parse_mode: "HTML" }
  );
}
