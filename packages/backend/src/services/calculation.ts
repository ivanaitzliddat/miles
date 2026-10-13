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
  rateId: number | null;  // null when no earning rate is eligible
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
 * Returns the highest-mpd eligible rate, or null when no rule applies.
 * FOREIGN_ASEAN can use eligible FOREIGN rules when no ASEAN rule applies.
 */
function isEligible(
  rate: EarningRate,
  input: TransactionInput,
  periodSpendByRateId: Map<number, number>,
  totalMonthlySpend: number,
  excludedRateIds: number[],
  ignoreCap = false
): boolean {
  if (excludedRateIds.includes(rate.id) || rate.spendCategory !== input.spendCategory) return false;
  if (rate.paymentMethod && rate.paymentMethod !== input.paymentMethod) return false;
  if (rate.merchantCategories.length > 0 &&
      (!input.merchantCategory || !rate.merchantCategories.includes(input.merchantCategory as never))) return false;
  if (input.merchantCategory && rate.excludedMerchantCategories.includes(input.merchantCategory as never)) return false;
  if (!ignoreCap && rate.monthlyCapSgd !== null &&
      (periodSpendByRateId.get(rate.id) ?? 0) >= rate.monthlyCapSgd) return false;
  if (rate.minimumMonthlySpendSgd !== null && totalMonthlySpend < rate.minimumMonthlySpendSgd) return false;
  return true;
}

export function findBestRate(
  rates: EarningRate[],
  input: TransactionInput,
  periodSpendByRateId: Map<number, number>,
  totalMonthlySpend: number,
  excludedRateIds: number[] = []
): EarningRate | null {
  const eligible = (candidate: TransactionInput) => rates.filter(rate =>
    isEligible(rate, candidate, periodSpendByRateId, totalMonthlySpend, excludedRateIds));
  let applicable = eligible(input);
  if (applicable.length === 0 && input.spendCategory === "FOREIGN_ASEAN") {
    applicable = eligible({ ...input, spendCategory: "FOREIGN" });
  }
  return applicable.sort((a, b) => b.milesPerDollar - a.milesPerDollar)[0] ?? null;
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
  baseRate: EarningRate | undefined,
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

  if (!bestRate) {
    return { rewardEarned: 0, milesEarned: 0, effectiveMpd: 0,
      rateId: null, billableAmount: 0, capRemaining: null };
  }

  const billableAmount = getBillableAmount(input.amountSgd, bestRate.roundDownTo);

  // Find base rate for cap overflow calculation
  const baseInput = { ...input, spendCategory: bestRate.spendCategory };
  const baseRate = card.earningRates.filter(r =>
    r.monthlyCapSgd === null && r.id !== bestRate.id &&
    isEligible(r, baseInput, periodSpendByRateId, totalMonthlySpend, excludedRateIds)
  ).sort((a, b) => b.milesPerDollar - a.milesPerDollar)[0];

  const periodSpend = periodSpendByRateId.get(bestRate.id) ?? 0;
  const { bonusAmount, baseAmount } = splitAtCap(
    billableAmount,
    bestRate,
    baseRate,
    periodSpend
  );

  const bonusReward = bonusAmount * bestRate.rewardPerDollar;
  const baseReward = baseAmount * (baseRate?.rewardPerDollar ?? 0);
  const totalReward = bonusReward + baseReward;

  const bonusMiles = bonusAmount * bestRate.milesPerDollar;
  const baseMiles = baseAmount * (baseRate?.milesPerDollar ?? 0);
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

    if (!bestRate) {
      return { userCardId: uc.userCardId, cardSlug: uc.cardSlug, cardName: uc.cardName,
        bank: uc.bank, effectiveMpd: 0, milesEarned: 0, capRemaining: null,
        capExhausted: false, exhaustedBonusMpd: null,
        reasoning: "No eligible earning rate for this transaction" };
    }

    // Detect if a higher-mpd capped rate was excluded purely because the cap was exhausted.
    // This lets the frontend show "was X mpd, cap reached" instead of silently showing base rate.
    const exhaustedBonus = uc.card.earningRates.find((r) => {
      if (uc.excludedRateIds.includes(r.id)) return false;
      if (bestRate.monthlyCapSgd !== null || !isEligible(r,
        { ...input, spendCategory: bestRate.spendCategory },
        uc.periodSpendByRateId, uc.totalMonthlySpend, uc.excludedRateIds, true)) return false;
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
