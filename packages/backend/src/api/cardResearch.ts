/**
 * Card research routes.
 *
 * POST /cards/research            — research an unknown card by name (AI agent)
 * POST /cards/research/confirm    — save a researched card draft to DB
 */

import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { strictRateLimit } from "../middleware/security.js";
import { researchCard, CardResearchResultSchema } from "../services/cardResearchAgent.js";

const router = Router();

// ── Reward type normaliser ────────────────────────────────────────────────────
// Maps free-text strings the AI might return to our known RewardType enum values.
// Falls back to OTHER only when genuinely unrecognisable.

const REWARD_TYPE_MAP: Record<string, string> = {
  // DBS
  dbs_points: "DBS_POINTS",
  "dbs points": "DBS_POINTS",
  // UOB
  uni_dollar: "UNI_DOLLAR",
  "uni$": "UNI_DOLLAR",
  unidollar: "UNI_DOLLAR",
  // Citi
  thankyou_points: "THANKYOU_POINTS",
  "citi thankyou": "THANKYOU_POINTS",
  citi_miles: "CITI_MILES",
  "citi miles": "CITI_MILES",
  // OCBC
  ocbc_travel_dollars: "OCBC_TRAVEL_DOLLARS",
  "travel$": "OCBC_TRAVEL_DOLLARS",
  "ocbc$": "OCBC_TRAVEL_DOLLARS",
  ocbc_dollars: "OCBC_TRAVEL_DOLLARS",
  ocbc_voyage_miles: "OCBC_VOYAGE_MILES",
  "voyage miles": "OCBC_VOYAGE_MILES",
  // SCB
  scb_360_rewards: "SCB_360_REWARDS",
  "360° rewards": "SCB_360_REWARDS",
  "360 rewards": "SCB_360_REWARDS",
  // HSBC
  hsbc_reward_points: "HSBC_REWARD_POINTS",
  "hsbc reward points": "HSBC_REWARD_POINTS",
  "hsbc points": "HSBC_REWARD_POINTS",
  // Maybank
  maybank_treats: "MAYBANK_TREATS",
  "treats points": "MAYBANK_TREATS",
  treats: "MAYBANK_TREATS",
  // Amex
  krisflyer_miles: "KRISFLYER_MILES",
  "krisflyer miles": "KRISFLYER_MILES",
  krisflyer: "KRISFLYER_MILES",
  amex_mr: "AMEX_MR",
  "membership rewards": "AMEX_MR",
  // BOC
  boc_points: "BOC_POINTS",
  "boc bonus points": "BOC_POINTS",
};

function normaliseRewardType(raw: string | null | undefined): string {
  if (!raw) return "OTHER";
  const key = raw.toLowerCase().trim();
  return REWARD_TYPE_MAP[key] ?? "OTHER";
}

// ── Validation schemas ────────────────────────────────────────────────────────

const ResearchRequestSchema = z.object({
  cardName: z.string().min(3).max(100),
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /cards/research
 *
 * Triggers the AI research agent. This can take 10–30 seconds
 * as Claude searches the web. Returns a draft for the user to review.
 *
 * Rate limited strictly — each call uses Claude API credits.
 */
router.post("/", strictRateLimit, async (req, res, next) => {
  try {
    const { cardName } = ResearchRequestSchema.parse(req.body);

    // Check if card already exists in catalog
    const existing = await prisma.card.findFirst({
      where: {
        OR: [
          { name: { contains: cardName, mode: "insensitive" } },
          { fullName: { contains: cardName, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      res.json({
        alreadyExists: true,
        card: existing,
        message: "This card is already in the catalog.",
      });
      return;
    }

    const result = await researchCard(cardName);

    if (!result.found) {
      res.status(404).json({
        found: false,
        reason: result.notFoundReason ?? "Card not found.",
        suggestion: "Please check the card name and try again, or add it manually.",
      });
      return;
    }

    res.json({
      found: true,
      draft: result,
      message:
        result.confidence === "LOW"
          ? "Research completed with low confidence. Please verify all rates before confirming."
          : "Please review the extracted data and confirm to add to the catalog.",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /cards/research/confirm
 *
 * User has reviewed the AI-extracted data and confirmed it looks correct.
 * Saves to DB as DRAFT status (pending admin approval before going ACTIVE).
 */
router.post("/confirm", strictRateLimit, async (req, res, next) => {
  try {
    const draft = CardResearchResultSchema.parse(req.body.draft);

    if (!draft.found || !draft.slug || !draft.bank || !draft.fullName) {
      throw new AppError(400, "Invalid draft data.");
    }

    // Validate bank value against our enum
    const validBanks = ["DBS", "UOB", "CITI", "OCBC", "SCB", "HSBC", "MAYBANK", "AMEX", "BOC"];
    const bank = validBanks.includes(draft.bank ?? "") ? draft.bank : "OTHER";

    // Check slug uniqueness
    const slugExists = await prisma.card.findUnique({
      where: { slug: draft.slug },
    });
    if (slugExists) {
      throw new AppError(409, `A card with slug "${draft.slug}" already exists.`);
    }

    // Save card as DRAFT
    const card = await prisma.card.create({
      data: {
        slug: draft.slug,
        bank: bank as never,
        name: draft.name ?? draft.fullName,
        fullName: draft.fullName,
        rewardType: normaliseRewardType(draft.rewardType) as never,
        rewardUnit: draft.rewardUnit ?? "Points",
        rewardToMilesRate: draft.rewardToMilesRate ?? 1.0,
        primaryMilesPartner: draft.primaryMilesPartner ?? "KrisFlyer",
        transferPartners: draft.transferPartners,
        transferFeeSgd: draft.transferFeeSgd ?? null,
        officialUrl: draft.officialUrl ?? "",
        notes: draft.notes ?? null,
        status: "DRAFT",
        lastVerifiedAt: new Date(),
        earningRates: {
          create: draft.earningRates.map((rate) => ({
            spendCategory: rate.spendCategory as never,
            paymentMethod: rate.paymentMethod as never ?? null,
            merchantCategories: (rate.merchantCategories ?? []) as never,
            excludedMerchantCategories: (rate.excludedMerchantCategories ?? []) as never,
            milesPerDollar: rate.milesPerDollar,
            rewardPerDollar: rate.rewardPerDollar,
            roundDownTo: rate.roundDownTo ?? null,
            monthlyCapSgd: rate.monthlyCapSgd ?? null,
            annualCapSgd: rate.annualCapSgd ?? null,
            minimumMonthlySpendSgd: rate.minimumMonthlySpendSgd ?? null,
            description: rate.description ?? null,
          })),
        },
      },
      include: { earningRates: true },
    });

    res.status(201).json({
      card,
      message: `"${card.fullName}" added to catalog as DRAFT. It will be reviewed and made active by an admin.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
