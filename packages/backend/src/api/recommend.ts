/**
 * Card recommendation route.
 *
 * POST /recommend — given a spend scenario, rank the user's cards by effective MPD.
 *
 * The route loads the user's wallet and calls the ranking engine through milesService.
 */

import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getCardRecommendations } from "../services/milesService.js";

const router = Router();

const RecommendSchema = z.object({
  amountSgd: z.number().positive(),
  spendCategory: z.enum(["LOCAL", "FOREIGN", "FOREIGN_ASEAN"]),
  paymentMethod: z.enum(["CONTACTLESS", "ONLINE", "PHYSICAL"]),
  merchantCategory: z
    .enum([
      "DINING", "TRAVEL", "SIA_GROUP", "PETROL", "GROCERY", "SHOPPING",
      "TRANSPORT", "ENTERTAINMENT", "BEAUTY_WELLNESS", "EDUCATION",
      "HEALTHCARE", "UTILITIES", "ONLINE_SHOPPING", "ONLINE_TRAVEL", "FAMILY",
    ])
    .optional(),
});

// POST /recommend
router.post("/", async (req, res, next) => {
  try {
    if (!req.telegramUser) throw new AppError(401, "Not authenticated.");
    const body = RecommendSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(req.telegramUser.id) },
    });
    if (!user) throw new AppError(404, "User not found.");

    const recommendations = await getCardRecommendations(user.id, {
      amountSgd: body.amountSgd,
      spendCategory: body.spendCategory,
      paymentMethod: body.paymentMethod,
      merchantCategory: body.merchantCategory,
    });

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

export default router;
