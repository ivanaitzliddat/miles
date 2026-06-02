/**
 * User routes.
 *
 * POST /users                        — create or find user by Telegram ID
 * GET  /users/:telegramId/cards      — get user's wallet
 * POST /users/:telegramId/cards      — add a card to user's wallet
 * GET  /users/:telegramId/summary    — dashboard summary
 */

import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { strictRateLimit } from "../middleware/security.js";

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const UpsertUserSchema = z.object({
  telegramId: z.number().int().positive(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  username: z.string().max(50).optional(),
});

const AddCardSchema = z.object({
  cardId: z.number().int().positive(),
  nickname: z.string().max(50).optional(),
  billingCycleStartDay: z.number().int().min(1).max(28).default(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTelegramId(param: string | string[]): bigint {
  const raw = Array.isArray(param) ? param[0] : param;
  const id = BigInt(raw);
  if (id <= 0n) throw new AppError(400, "Invalid Telegram ID.");
  return id;
}

/** Ensure the authenticated user is only accessing their own data. */
function assertOwnership(req: import("express").Request, telegramId: bigint): void {
  if (!req.telegramUser) throw new AppError(401, "Not authenticated.");
  if (BigInt(req.telegramUser.id) !== telegramId) {
    throw new AppError(403, "You can only access your own data.");
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /users — create or find user (called on Mini App open)
// Identity comes from req.telegramUser (verified by telegramAuth middleware),
// not from the request body — the body is ignored for security.
router.post("/", strictRateLimit, async (req, res, next) => {
  try {
    if (!req.telegramUser) throw new AppError(401, "Not authenticated.");

    const { id, firstName, lastName, username } = req.telegramUser;

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(id) },
      update: { firstName, lastName: lastName ?? null, username: username ?? null },
      create: { telegramId: BigInt(id), firstName, lastName: lastName ?? null, username: username ?? null },
    });

    res.json({ user: { ...user, telegramId: user.telegramId.toString() } });
  } catch (err) {
    next(err);
  }
});

// GET /users/:telegramId/cards
router.get("/:telegramId/cards", async (req, res, next) => {
  try {
    const telegramId = parseTelegramId(req.params.telegramId);
    assertOwnership(req, telegramId);

    const userCards = await prisma.userCard.findMany({
      where: { user: { telegramId } },
      include: { card: { include: { earningRates: true } } },
      orderBy: { addedAt: "asc" },
    });

    res.json({ userCards });
  } catch (err) {
    next(err);
  }
});

// POST /users/:telegramId/cards — add card to wallet
router.post("/:telegramId/cards", strictRateLimit, async (req, res, next) => {
  try {
    const telegramId = parseTelegramId(req.params.telegramId);
    assertOwnership(req, telegramId);
    const body = AddCardSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new AppError(404, "User not found.");

    const card = await prisma.card.findUnique({ where: { id: body.cardId } });
    if (!card) throw new AppError(404, "Card not found.");

    const existing = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId: user.id, cardId: body.cardId } },
    });
    if (existing) throw new AppError(409, "Card already in wallet.");

    const userCard = await prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: body.cardId,
        nickname: body.nickname ?? null,
        billingCycleStartDay: body.billingCycleStartDay,
      },
      include: { card: true },
    });

    res.status(201).json({ userCard });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:telegramId/cards/:userCardId — update wallet card settings
router.patch("/:telegramId/cards/:userCardId", strictRateLimit, async (req, res, next) => {
  try {
    const telegramId = parseTelegramId(req.params.telegramId);
    assertOwnership(req, telegramId);
    const userCardId = parseInt(Array.isArray(req.params.userCardId) ? req.params.userCardId[0] : req.params.userCardId, 10);
    if (isNaN(userCardId)) throw new AppError(400, "Invalid userCard ID.");

    const SettingsSchema = z.object({
      excludedRateIds: z.array(z.number().int()).optional(),
    });
    const { excludedRateIds } = SettingsSchema.parse(req.body);

    // Verify ownership
    const userCard = await prisma.userCard.findFirst({
      where: { id: userCardId, user: { telegramId } },
    });
    if (!userCard) throw new AppError(404, "Card not found in your wallet.");

    const updated = await prisma.userCard.update({
      where: { id: userCardId },
      data: { ...(excludedRateIds !== undefined && { excludedRateIds }) },
      include: { card: { include: { earningRates: true } } },
    });

    res.json({ userCard: updated });
  } catch (err) {
    next(err);
  }
});

// GET /users/:telegramId/transactions — recent transactions for dashboard
router.get("/:telegramId/transactions", async (req, res, next) => {
  try {
    const telegramId = parseTelegramId(req.params.telegramId);
    assertOwnership(req, telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new AppError(404, "User not found.");

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { transactionDate: "desc" },
      take: 20,
      include: { userCard: { include: { card: true } } },
    });

    res.json({ transactions });
  } catch (err) {
    next(err);
  }
});

// GET /users/:telegramId/summary — dashboard data
router.get("/:telegramId/summary", async (req, res, next) => {
  try {
    const telegramId = parseTelegramId(req.params.telegramId);
    assertOwnership(req, telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new AppError(404, "User not found.");

    // Total miles all time
    const totals = await prisma.transaction.aggregate({
      where: { userId: user.id },
      _sum: { milesEarned: true, amountSgd: true },
      _count: { id: true },
    });

    // This month's miles
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = await prisma.transaction.aggregate({
      where: { userId: user.id, transactionDate: { gte: monthStart } },
      _sum: { milesEarned: true },
    });

    // Per-card breakdown
    const userCards = await prisma.userCard.findMany({
      where: { userId: user.id },
      include: { card: true },
    });

    const byCard = await Promise.all(
      userCards.map(async (uc) => {
        const cardTotals = await prisma.transaction.aggregate({
          where: { userCardId: uc.id },
          _sum: { milesEarned: true, amountSgd: true, rewardEarned: true },
          _count: { id: true },
        });
        return {
          userCardId: uc.id,
          cardSlug: uc.card.slug,
          bank: uc.card.bank,
          cardName: uc.nickname ?? uc.card.name,
          rewardUnit: uc.card.rewardUnit,
          totalMiles: cardTotals._sum.milesEarned ?? 0,
          totalSpend: cardTotals._sum.amountSgd ?? 0,
          rewardBalance: cardTotals._sum.rewardEarned ?? 0,
          transactionCount: cardTotals._count.id,
        };
      })
    );

    // 5 most recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { transactionDate: "desc" },
      take: 5,
      include: { userCard: { include: { card: true } } },
    });

    res.json({
      summary: {
        totalMiles: totals._sum.milesEarned ?? 0,
        totalSpend: totals._sum.amountSgd ?? 0,
        totalTransactions: totals._count.id,
        thisMonthMiles: thisMonth._sum.milesEarned ?? 0,
        byCard,
        recentTransactions,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
