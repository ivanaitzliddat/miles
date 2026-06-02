/**
 * Card catalog routes.
 *
 * GET /cards          — list all active cards
 * GET /cards/:slug    — get one card with its earning rates
 */

import { Router } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

// GET /cards
router.get("/", async (_req, res, next) => {
  try {
    const cards = await prisma.card.findMany({
      where: { status: "ACTIVE" },
      include: { earningRates: true },
      orderBy: [{ bank: "asc" }, { name: "asc" }],
    });
    res.json({ cards });
  } catch (err) {
    next(err);
  }
});

// GET /cards/:slug
router.get("/:slug", async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({
      where: { slug: req.params.slug },
      include: { earningRates: true },
    });

    if (!card) throw new AppError(404, "Card not found.");
    res.json({ card });
  } catch (err) {
    next(err);
  }
});

export default router;
