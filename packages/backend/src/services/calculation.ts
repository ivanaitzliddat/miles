/**
 * Miles Calculation Engine — pure functions, no database dependencies.
 *
 * Design: all functions are pure (same inputs → same outputs, no side effects).
 * This makes them trivially unit testable and reusable across routes.
 *
 * The DB layer (milesService.ts) handles fetching period spend and calls these.
 */

import type { EarningRate, Card } from "@prisma/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TransactionInput {
  amountSgd: number;
  spendCategory: "LOCAL" | "FOREIGN" | "FOREIGN_ASEAN";
  paymentMethod: "CONTACTLESS" | "ONLINE" | "PHYSICAL";
  merchantCategory?: string | null;
}

export interface CalcResult {
  rewardEarned: number;   // raw reward units (e.g. DBS Points, UNI$)
  milesEarned: number;    // equivalent air miles
  effectiveMpd: number;   // actual mpd after caps and rounding
  rateId: number;         // which EarningRate was applied
  billableAmount: number; // amount after rounding down (for display)
  capRemaining: number | null; // null = no cap on this rate
}

export interface Recommendation {
  userCardId: number;
  cardSlug: string;
  cardName: string;
  bank: string;
  effectiveMpd: number;
  milesEarned: number;
  capRemaining: number | null;
  /** true when a bonus-rate cap was fully exhausted and we fell back to base rate */
  capExhausted: boolean;
  /** the bonus mpd that was excluded due to cap exhaustion (null if no bonus applies) */
  exhaustedBonusMpd: number | null;
  reasoning: string;
}

// ─────────────────────────────────────────────
// Step 1: Find the best applicable earning rate
// ─────────────────────────────────────────────

/**
 * From a card's earning rates, find the one that applies to this transaction
 * and gives the highest effective MPD after considering caps.
 *
 * Matching rules (all conditions must pass):
 *   1. spendCategory must match
 *   2. paymentMethod must match (or rate has no paymentMethod restriction)
 *   3. merchantCategory must be in rate.merchantCategories (or rate has no restriction)
 *   4. merchantCategory must NOT be in rate.excludedMerchantCategories
 *   5. periodSpend must be below rate.monthlyCapSgd (if cap exists)
 *   6. totalMonthlySpend must meet rate.minimumMonthlySpendSgd (if unlock exists)
 *
 * Returns the highest-mpd applicable rate, falling back to the base rate.
 */
export function findBestRate(
  rates: EarningRate[],
  input: TransactionInput,
  periodSpendByRateId: Map<number, number>, // rateId → SGD spent so far this period
  totalMonthlySpend: number,                // total spend this month (for unlock checks)
  excludedRateIds: number[] = []            // rate IDs this user can't access
): EarningRate {
  const applicable = rates.filter((rate) => {
    // Skip rates the user has explicitly excluded (e.g. savings account tier without account)
    if (excludedRateIds.includes(rate.id)) return false;
    // 1. Spend category
    if (rate.spendCategory !== input.spendCategory) return false;

    // 2. Payment method (null = any)
    if (rate.paymentMethod && rate.paymentMethod !== input.paymentMethod) return false;

    // 3. Merchant category inclusion
    if (rate.merchantCategories.length > 0) {
      if (!input.merchantCategory) return false;
      if (!rate.merchantCategories.includes(input.merchantCategory as never)) return false;
    }

    // 4. Merchant category exclusion
    if (
      input.merchantCategory &&
      rate.excludedMerchantCategories.includes(input.merchantCategory as never)
    ) return false;

    // 5. Monthly cap — if cap is fully used, this rate no longer applies
    if (rate.monthlyCapSgd !== null) {
      const spent = periodSpendByRateId.get(rate.id) ?? 0;
      if (spent >= rate.monthlyCapSgd) return false;
    }

    // 6. Minimum monthly spend unlock
    if (
      rate.minimumMonthlySpendSgd !== null &&
      totalMonthlySpend < rate.minimumMonthlySpendSgd
    ) return false;

    return true;
  });

  if (applicable.length === 0) {
    // Fallback 1: uncapped base rate for the same spend category
    const baseRates = rates.filter(
      (r) =>
        r.spendCategory === input.spendCategory &&
        !r.paymentMethod &&
        r.merchantCategories.length === 0 &&
        r.monthlyCapSgd === null &&
        !excludedRateIds.includes(r.id)
    );
    if (baseRates.length > 0) return baseRates.sort((a, b) => b.milesPerDollar - a.milesPerDollar)[0];

    // Fallback 2: FOREIGN_ASEAN → treat as FOREIGN (ASEAN is a subset of foreign spend;
    // cards without an explicit ASEAN rate earn the same as regular foreign spend).
    if (input.spendCategory === "FOREIGN_ASEAN") {
      const foreignRates = rates.filter(
        (r) =>
          r.spendCategory === "FOREIGN" &&
          !r.paymentMethod &&
          r.merchantCategories.length === 0 &&
          r.monthlyCapSgd === null &&
          !excludedRateIds.includes(r.id)
      );
      if (foreignRates.length > 0) return foreignRates.sort((a, b) => b.milesPerDollar - a.milesPerDollar)[0];
    }

    // Fallback 3: any rate for this category (catches capped rates with no base alternative)
    const anySameCategory = rates
      .filter((r) => r.spendCategory === input.spendCategory && !excludedRateIds.includes(r.id))
      .sort((a, b) => a.milesPerDollar - b.milesPerDollar);
    if (anySameCategory.length > 0) return anySameCategory[0];

    // Fallback 4: FOREIGN_ASEAN → any FOREIGN rate
    if (input.spendCategory === "FOREIGN_ASEAN") {
      const anyForeign = rates
        .filter((r) => r.spendCategory === "FOREIGN" && !excludedRateIds.includes(r.id))
        .sort((a, b) => a.milesPerDollar - b.milesPerDollar);
      if (anyForeign.length > 0) return anyForeign[0];
    }

    // Should never reach here — every card must have at least one rate
    return rates[0];
  }

  // Return the highest mpd applicable rate
  return applicable.sort((a, b) => b.milesPerDollar - a.milesPerDollar)[0];
}

// ─────────────────────────────────────────────
// Step 2: Apply rounding
// ─────────────────────────────────────────────

/**
 * Some banks (UOB, OCBC, Maybank) round the transaction amount down to the
 * nearest $X block before calculating rewards.
 *
 * e.g. UOB with roundDownTo=5: $23 → $20 billable ($3 earns nothing)
 *      DBS (no roundDownTo):   $23 → $23 billable
 */
export function getBillableAmount(amountSgd: number, roundDownTo?: number | null): number {
  if (!roundDownTo) return amountSgd;
  return Math.floor(amountSgd / roundDownTo) * roundDownTo;
}

// ─────────────────────────────────────────────
// Step 3: Handle partial cap application
// ─────────────────────────────────────────────

/**
 * When a spend partially exceeds a monthly cap, two rates apply:
 *   - Bonus rate on the remaining cap amount
 *   - Base rate on the overflow
 *
 * e.g. HSBC Revolution: cap S$1,000/month at 4 mpd, base 0.4 mpd
 *   If S$950 already spent and you spend S$100:
 *   → S$50 at 4 mpd = 200 miles
 *   → S$50 at 0.4 mpd = 20 miles
 *   → total: 220 miles, effectiveMpd = 2.2
 */
export function splitAtCap(
  billableAmount: number,
  bonusRate: EarningRate,
  baseRate: EarningRate,
  periodSpend: number
): { bonusAmount: number; baseAmount: number } {
  if (bonusRate.monthlyCapSgd === null) {
    return { bonusAmount: billableAmount, baseAmount: 0 };
  }

  const capRemaining = Math.max(0, bonusRate.monthlyCapSgd - periodSpend);

  if (capRemaining <= 0) {
    return { bonusAmount: 0, baseAmount: billableAmount };
  }

  if (billableAmount <= capRemaining) {
    return { bonusAmount: billableAmount, baseAmount: 0 };
  }

  return {
    bonusAmount: capRemaining,
    baseAmount: billableAmount - capRemaining,
  };
}

// ─────────────────────────────────────────────
// Step 4: Calculate miles for a transaction
// ─────────────────────────────────────────────

export function calculateMiles(
  card: Card & { earningRates: EarningRate[] },
  input: TransactionInput,
  periodSpendByRateId: Map<number, number>,
  totalMonthlySpend: number,
  excludedRateIds: number[] = []
): CalcResult {
  const bestRate = findBestRate(
    card.earningRates,
    input,
    periodSpendByRateId,
    totalMonthlySpend,
    excludedRateIds
  );

  const billableAmount = getBillableAmount(input.amountSgd, bestRate.roundDownTo);

  // Find base rate for cap overflow calculation
  const baseRate = card.earningRates.find(
    (r) =>
      r.spendCategory === input.spendCategory &&
      !r.paymentMethod &&
      r.merchantCategories.length === 0 &&
      r.monthlyCapSgd === null &&
      r.id !== bestRate.id
  ) ?? bestRate;

  const periodSpend = periodSpendByRateId.get(bestRate.id) ?? 0;
  const { bonusAmount, baseAmount } = splitAtCap(
    billableAmount,
    bestRate,
    baseRate,
    periodSpend
  );

  const bonusReward = bonusAmount * bestRate.rewardPerDollar;
  const baseReward = baseAmount * baseRate.rewardPerDollar;
  const totalReward = bonusReward + baseReward;

  const bonusMiles = bonusAmount * bestRate.milesPerDollar;
  const baseMiles = baseAmount * baseRate.milesPerDollar;
  const totalMiles = bonusMiles + baseMiles;

  const effectiveMpd =
    input.amountSgd > 0
      ? Math.round((totalMiles / input.amountSgd) * 1000) / 1000
      : 0;

  const capRemaining =
    bestRate.monthlyCapSgd !== null
      ? Math.max(0, bestRate.monthlyCapSgd - periodSpend - bonusAmount)
      : null;

  return {
    rewardEarned: Math.round(totalReward * 100) / 100,
    milesEarned: Math.round(totalMiles * 100) / 100,
    effectiveMpd,
    rateId: bestRate.id,
    billableAmount,
    capRemaining,
  };
}

// ─────────────────────────────────────────────
// Step 5: Rank cards for recommendation
// ─────────────────────────────────────────────

export interface UserCardForRanking {
  userCardId: number;
  cardSlug: string;
  cardName: string;
  bank: string;
  card: Card & { earningRates: EarningRate[] };
  periodSpendByRateId: Map<number, number>;
  totalMonthlySpend: number;
  excludedRateIds: number[];
}

export function rankCards(
  userCards: UserCardForRanking[],
  input: TransactionInput
): Recommendation[] {
  const results = userCards.map((uc) => {
    const result = calculateMiles(
      uc.card,
      input,
      uc.periodSpendByRateId,
      uc.totalMonthlySpend,
      uc.excludedRateIds
    );

    const bestRate = findBestRate(
      uc.card.earningRates,
      input,
      uc.periodSpendByRateId,
      uc.totalMonthlySpend,
      uc.excludedRateIds
    );

    // Detect if a higher-mpd capped rate was excluded purely because the cap was exhausted.
    // This lets the frontend show "was X mpd, cap reached" instead of silently showing base rate.
    const exhaustedBonus = uc.card.earningRates.find((r) => {
      if (uc.excludedRateIds.includes(r.id)) return false;
      if (r.spendCategory !== input.spendCategory) return false;
      if (r.monthlyCapSgd === null) return false;
      if (r.milesPerDollar <= result.effectiveMpd) return false;
      const spent = uc.periodSpendByRateId.get(r.id) ?? 0;
      return spent >= r.monthlyCapSgd;
    });

    const capExhausted = exhaustedBonus !== undefined;
    const reasoning = buildReasoning(bestRate, result, uc.card, capExhausted, exhaustedBonus?.milesPerDollar ?? null);

    return {
      userCardId: uc.userCardId,
      cardSlug: uc.cardSlug,
      cardName: uc.cardName,
      bank: uc.bank,
      effectiveMpd: result.effectiveMpd,
      milesEarned: result.milesEarned,
      capRemaining: result.capRemaining,
      capExhausted,
      exhaustedBonusMpd: exhaustedBonus?.milesPerDollar ?? null,
      reasoning,
    };
  });

  return results.sort((a, b) => b.effectiveMpd - a.effectiveMpd);
}

function buildReasoning(
  rate: EarningRate,
  result: CalcResult,
  card: Card,
  capExhausted: boolean,
  exhaustedBonusMpd: number | null
): string {
  const parts: string[] = [];

  if (capExhausted && exhaustedBonusMpd !== null) {
    parts.push(`${exhaustedBonusMpd} mpd cap reached → ${result.effectiveMpd} mpd base`);
  } else {
    parts.push(`${result.effectiveMpd} mpd effective`);
    if (rate.monthlyCapSgd !== null && result.capRemaining !== null && result.capRemaining > 0) {
      parts.push(`S$${result.capRemaining.toFixed(0)} cap left`);
    }
  }

  if (rate.roundDownTo) {
    parts.push(`S$${rate.roundDownTo} blocks`);
  }

  return parts.join(" · ");
}
