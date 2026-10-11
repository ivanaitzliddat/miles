/**
 * Transaction routes.
 *
 * POST /transactions          — log a new transaction (miles calculated server-side)
 * GET  /transactions/:id      — get a single transaction
 */

import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { strictRateLimit } from "../middleware/security.js";
import { calculateTransactionMiles } from "../services/milesService.js";

const router = Router();

// ── Validation schema ─────────────────────────────────────────────────────────

const CreateTransactionSchema = z.object({
  userCardId: z.number().int().positive(),
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(), // ISO 4217
  amountSgd: z.number().positive(),             // client provides FX-converted amount
  spendCategory: z.enum(["LOCAL", "FOREIGN", "FOREIGN_ASEAN"]),
  paymentMethod: z.enum(["CONTACTLESS", "ONLINE", "PHYSICAL"]),
  merchantCategory: z
    .enum([
      "DINING", "TRAVEL", "SIA_GROUP", "PETROL", "GROCERY", "SHOPPING",
      "TRANSPORT", "ENTERTAINMENT", "BEAUTY_WELLNESS", "EDUCATION",
      "HEALTHCARE", "UTILITIES", "ONLINE_SHOPPING", "ONLINE_TRAVEL", "FAMILY",
    ])
    .optional(),
  description: z.string().max(200).optional(),
  merchantName: z.string().max(100).optional(),
  transactionDate: z.string().datetime().optional(), // ISO 8601; defaults to now
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /transactions
router.post("/", strictRateLimit, async (req, res, next) => {
  try {
    if (!req.telegramUser) throw new AppError(403, "Not authenticated.");
    const body = CreateTransactionSchema.parse(req.body);

    // Verify user owns this userCard using the authenticated identity
    const userCard = await prisma.userCard.findFirst({
      where: {
        id: body.userCardId,
        user: { telegramId: BigInt(req.telegramUser.id) },
      },
      include: {
        card: { include: { earningRates: true } },
        user: true,
      },
    });

    if (!userCard) {
      throw new AppError(403, "Card not found in your wallet.");
    }

    const calcResult = await calculateTransactionMiles(userCard, {
      amountSgd: body.amountSgd,
      spendCategory: body.spendCategory,
      paymentMethod: body.paymentMethod,
      merchantCategory: body.merchantCategory,
    });

    const { milesEarned, rewardEarned, effectiveMpd } = calcResult;

    const transaction = await prisma.transaction.create({
      data: {
        userId: userCard.userId,
        userCardId: body.userCardId,
        amount: body.amount,
        currency: body.currency,
        amountSgd: body.amountSgd,
        spendCategory: body.spendCategory,
        paymentMethod: body.paymentMethod,
        merchantCategory: body.merchantCategory ?? null,
        description: body.description ?? null,
        merchantName: body.merchantName ?? null,
        rewardEarned,
        milesEarned,
        effectiveMpd,
        transactionDate: body.transactionDate
          ? new Date(body.transactionDate)
          : new Date(),
      },
    });

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
});

// GET /transactions/:id
router.get("/:id", async (req, res, next) => {
  try {
    if (!req.telegramUser) throw new AppError(401, "Not authenticated.");
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, "Invalid transaction ID.");

    const transaction = await prisma.transaction.findFirst({
      where: { id, user: { telegramId: BigInt(req.telegramUser.id) } },
      include: { userCard: { include: { card: true } } },
    });

    if (!transaction) throw new AppError(404, "Transaction not found.");

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
});

export default router;
