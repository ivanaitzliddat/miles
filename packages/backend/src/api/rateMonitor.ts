/**
 * Rate monitor admin routes.
 *
 * POST /admin/monitor/run          — trigger a manual rate check (all ACTIVE cards)
 * GET  /admin/monitor/pending      — list all pending rate changes
 * POST /admin/monitor/:id/approve  — approve a change (updates DB + records history)
 * POST /admin/monitor/:id/reject   — reject a change (dismisses it)
 */

import { Router } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { strictRateLimit } from "../middleware/security.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { runRateMonitor } from "../services/rateMonitorAgent.js";
import { resolveRateChange } from "../services/rateChangeReview.js";

const router = Router();

router.use(requireAdmin);

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
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, "Invalid ID.");
    await resolveRateChange(id, "APPROVED", String(req.telegramUser!.id));

    res.json({ message: "Change approved and applied.", changeId: id });
  } catch (err) {
    next(err);
  }
});

// POST /admin/monitor/:id/reject
router.post("/:id/reject", strictRateLimit, async (req, res, next) => {
  try {
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, "Invalid ID.");
    await resolveRateChange(id, "REJECTED", String(req.telegramUser!.id));

    res.json({ message: "Change rejected.", changeId: id });
  } catch (err) {
    next(err);
  }
});

export default router;
