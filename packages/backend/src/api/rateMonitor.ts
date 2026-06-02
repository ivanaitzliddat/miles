/**
 * Rate monitor admin routes.
 *
 * POST /admin/monitor/run          — trigger a manual rate check (all ACTIVE cards)
 * GET  /admin/monitor/pending      — list all pending rate changes
 * POST /admin/monitor/:id/approve  — approve a change (updates DB + records history)
 * POST /admin/monitor/:id/reject   — reject a change (dismisses it)
 */

import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { strictRateLimit } from "../middleware/security.js";
import { runRateMonitor } from "../services/rateMonitorAgent.js";

const router = Router();

const ResolveSchema = z.object({
  resolvedBy: z.string().min(1).max(50), // Telegram username of admin
});

// POST /admin/monitor/run — trigger a manual check
router.post("/run", strictRateLimit, async (_req, res, next) => {
  try {
    console.log("Rate monitor triggered manually...");
    const summary = await runRateMonitor();
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// GET /admin/monitor/pending — list all pending changes
router.get("/pending", async (_req, res, next) => {
  try {
    const pending = await prisma.pendingRateChange.findMany({
      where: { status: "PENDING" },
      include: { card: { select: { fullName: true, bank: true, slug: true } } },
      orderBy: { detectedAt: "desc" },
    });

    res.json({ count: pending.length, changes: pending });
  } catch (err) {
    next(err);
  }
});

// POST /admin/monitor/:id/approve
router.post("/:id/approve", strictRateLimit, async (req, res, next) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) throw new AppError(400, "Invalid ID.");

    const { resolvedBy } = ResolveSchema.parse(req.body);

    const change = await prisma.pendingRateChange.findUnique({
      where: { id },
      include: { card: { include: { earningRates: true } } },
    });

    if (!change) throw new AppError(404, "Pending change not found.");
    if (change.status !== "PENDING") throw new AppError(409, "Change already resolved.");

    // Apply the change to the DB
    if (change.field === "milesPerDollar" || change.field === "monthlyCapSgd" || change.field === "minimumMonthlySpendSgd") {
      // Find the matching earning rate by description
      const rate = change.card.earningRates.find(
        (r) => r.description === change.earningRateDescription ||
          `${r.spendCategory}${r.paymentMethod ? " · " + r.paymentMethod : ""}` === change.earningRateDescription
      );

      if (rate) {
        const numericValue = parseFloat(change.newValue.replace(/[^0-9.]/g, ""));
        await prisma.earningRate.update({
          where: { id: rate.id },
          data: { [change.field]: isNaN(numericValue) ? null : numericValue },
        });
      }
    }

    // Record in RateHistory
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

    // Mark card back to ACTIVE
    await prisma.card.update({
      where: { id: change.cardId },
      data: { status: "ACTIVE", lastVerifiedAt: new Date() },
    });

    // Mark change as resolved
    await prisma.pendingRateChange.update({
      where: { id },
      data: { status: "APPROVED", resolvedAt: new Date(), resolvedBy },
    });

    res.json({ message: "Change approved and applied.", changeId: id });
  } catch (err) {
    next(err);
  }
});

// POST /admin/monitor/:id/reject
router.post("/:id/reject", strictRateLimit, async (req, res, next) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) throw new AppError(400, "Invalid ID.");

    const { resolvedBy } = ResolveSchema.parse(req.body);

    const change = await prisma.pendingRateChange.findUnique({ where: { id } });
    if (!change) throw new AppError(404, "Pending change not found.");
    if (change.status !== "PENDING") throw new AppError(409, "Change already resolved.");

    // If this was the only pending change for this card, restore to ACTIVE
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

    res.json({ message: "Change rejected.", changeId: id });
  } catch (err) {
    next(err);
  }
});

export default router;
