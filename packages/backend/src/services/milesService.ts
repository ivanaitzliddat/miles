/**
 * Miles service — fetches period spend from DB and calls the calculation engine.
 */

import prisma from "../lib/prisma.js";
import { calculateMiles, rankCards } from "./calculation.js";
import type { TransactionInput, UserCardForRanking } from "./calculation.js";
import type { UserCard, Card, EarningRate } from "@prisma/client";

type UserCardWithCard = UserCard & { card: Card & { earningRates: EarningRate[] } };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the start of the current billing period for a UserCard.
 * e.g. billingCycleStartDay=15 → if today is the 20th, period started on the 15th.
 *                                  if today is the 10th, period started on the 15th last month.
 */
function getBillingPeriodStart(billingCycleStartDay: number): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (day >= billingCycleStartDay) {
    return new Date(year, month, billingCycleStartDay);
  } else {
    return new Date(year, month - 1, billingCycleStartDay);
  }
}

/**
 * For each earning rate on a card, get how much has already been spent
 * against that rate's cap in the current billing period.
 *
 * Returns a Map<rateId, SGD spent this period under that rate>.
 */
async function getPeriodSpendByRate(
  userCardId: number,
  billingPeriodStart: Date
): Promise<Map<number, number>> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userCardId,
      transactionDate: { gte: billingPeriodStart },
    },
    select: { amountSgd: true, userCard: { select: { cardId: true } } },
  });

  // For now, bucket all spend against rateId via a secondary query on the rate
  // TODO: store rateId on Transaction in a future migration for better accuracy
  const totalSpend = transactions.reduce((sum, t) => sum + t.amountSgd, 0);

  // Return a simple map using total spend as a conservative estimate
  // The calculation engine will use this per-rate when checking caps
  const map = new Map<number, number>();

  // We use a single "total for this billing period" keyed by a sentinel -1
  // The calculation engine will query this via totalMonthlySpend
  map.set(-1, totalSpend);

  return map;
}

async function getTotalMonthlySpend(
  userCardId: number,
  billingPeriodStart: Date
): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      userCardId,
      transactionDate: { gte: billingPeriodStart },
    },
    _sum: { amountSgd: true },
  });
  return result._sum.amountSgd ?? 0;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate miles for a new transaction on a specific user card.
 */
export async function calculateTransactionMiles(
  userCard: UserCardWithCard,
  input: TransactionInput
) {
  const periodStart = getBillingPeriodStart(userCard.billingCycleStartDay);
  const totalMonthlySpend = await getTotalMonthlySpend(userCard.id, periodStart);

  // Build per-rate spend map from transactions in this period
  const transactions = await prisma.transaction.findMany({
    where: {
      userCardId: userCard.id,
      transactionDate: { gte: periodStart },
    },
    select: { amountSgd: true },
  });

  const totalSpend = transactions.reduce((sum, t) => sum + t.amountSgd, 0);

  // Map each rate ID to the total period spend (conservative — treats all spend
  // as counting against every capped rate until rateId is stored per transaction)
  const periodSpendByRateId = new Map<number, number>();
  for (const rate of userCard.card.earningRates) {
    if (rate.monthlyCapSgd !== null) {
      periodSpendByRateId.set(rate.id, totalSpend);
    }
  }

  return calculateMiles(
    userCard.card,
    input,
    periodSpendByRateId,
    totalMonthlySpend,
    userCard.excludedRateIds
  );
}

/**
 * Rank a user's cards for a given spend scenario.
 */
export async function getCardRecommendations(
  userId: number,
  input: TransactionInput
) {
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: { include: { earningRates: true } } },
  });

  const cardsForRanking: UserCardForRanking[] = await Promise.all(
    userCards.map(async (uc) => {
      const periodStart = getBillingPeriodStart(uc.billingCycleStartDay);
      const totalMonthlySpend = await getTotalMonthlySpend(uc.id, periodStart);

      const transactions = await prisma.transaction.findMany({
        where: {
          userCardId: uc.id,
          transactionDate: { gte: periodStart },
        },
        select: { amountSgd: true },
      });

      const totalSpend = transactions.reduce((sum, t) => sum + t.amountSgd, 0);

      const periodSpendByRateId = new Map<number, number>();
      for (const rate of uc.card.earningRates) {
        if (rate.monthlyCapSgd !== null) {
          periodSpendByRateId.set(rate.id, totalSpend);
        }
      }

      return {
        userCardId: uc.id,
        cardSlug: uc.card.slug,
        cardName: uc.nickname ?? uc.card.name,
        bank: uc.card.bank,
        card: uc.card,
        periodSpendByRateId,
        totalMonthlySpend,
        excludedRateIds: uc.excludedRateIds,
      };
    })
  );

  return rankCards(cardsForRanking, input);
}
