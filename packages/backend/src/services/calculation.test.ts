/**
 * Unit tests for the miles calculation engine.
 * Run with: npm test (from packages/backend)
 *
 * Tests use real card data shapes but hardcoded values — no DB required.
 */

import { describe, it, expect } from "vitest";
import {
  findBestRate,
  getBillableAmount,
  splitAtCap,
  calculateMiles,
  rankCards,
} from "./calculation.js";
import type { EarningRate, Card } from "@prisma/client";

// ─────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────

function makeRate(overrides: Partial<EarningRate>): EarningRate {
  return {
    id: 1,
    cardId: 1,
    spendCategory: "LOCAL",
    paymentMethod: null,
    merchantCategories: [],
    excludedMerchantCategories: [],
    milesPerDollar: 1.3,
    rewardPerDollar: 0.65,
    roundDownTo: null,
    monthlyCapSgd: null,
    annualCapSgd: null,
    minimumMonthlySpendSgd: null,
    description: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeCard(overrides: { earningRates: EarningRate[] } & Partial<Card>): Card & { earningRates: EarningRate[] } {
  return {
    id: 1,
    slug: "test-card",
    bank: "DBS",
    name: "Test Card",
    fullName: "Test Card",
    rewardType: "DBS_POINTS",
    rewardUnit: "DBS Points",
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [],
    transferFeeSgd: null,
    officialUrl: "https://example.com",
    notes: null,
    status: "ACTIVE",
    lastVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// getBillableAmount
// ─────────────────────────────────────────────

describe("getBillableAmount", () => {
  it("returns full amount when no rounding", () => {
    expect(getBillableAmount(23.50)).toBe(23.50);
  });

  it("rounds down to nearest $5 block (UOB)", () => {
    expect(getBillableAmount(23, 5)).toBe(20);
    expect(getBillableAmount(25, 5)).toBe(25);
    expect(getBillableAmount(4.99, 5)).toBe(0);
    expect(getBillableAmount(5, 5)).toBe(5);
  });

  it("handles exact multiples", () => {
    expect(getBillableAmount(100, 5)).toBe(100);
  });
});

// ─────────────────────────────────────────────
// findBestRate
// ─────────────────────────────────────────────

describe("findBestRate", () => {
  const baseLocal = makeRate({ id: 1, spendCategory: "LOCAL", milesPerDollar: 1.3 });
  const bonusOnline = makeRate({
    id: 2,
    spendCategory: "LOCAL",
    paymentMethod: "ONLINE",
    milesPerDollar: 4.0,
    monthlyCapSgd: 1000,
  });

  it("returns no eligible rate when a merchant exclusion rejects the only base rate", () => {
    const excluded = makeRate({ excludedMerchantCategories: ["TRAVEL"] });
    expect(findBestRate([excluded], { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE", merchantCategory: "TRAVEL" }, new Map(), 0)).toBeNull();
  });

  it("does not revive an unmet minimum-spend rate through a base fallback", () => {
    const locked = makeRate({ minimumMonthlySpendSgd: 800 });
    expect(findBestRate([locked], { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" }, new Map(), 500)).toBeNull();
  });

  it("does not revive an explicitly excluded rate or an exhausted capped rate", () => {
    const only = makeRate({ id: 1 });
    const input = { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" } as const;
    expect(findBestRate([only], input, new Map(), 0, [1])).toBeNull();
    expect(findBestRate([makeRate({ id: 1, monthlyCapSgd: 1000 })], input, new Map([[1, 1000]]), 0)).toBeNull();
  });

  it("applies eligibility checks to the FOREIGN_ASEAN fallback", () => {
    const input = { amountSgd: 100, spendCategory: "FOREIGN_ASEAN", paymentMethod: "ONLINE", merchantCategory: "TRAVEL" } as const;
    const invalid = makeRate({ id: 1, spendCategory: "FOREIGN", excludedMerchantCategories: ["TRAVEL"], milesPerDollar: 4 });
    const valid = makeRate({ id: 2, spendCategory: "FOREIGN", milesPerDollar: 1 });
    expect(findBestRate([invalid, valid], input, new Map(), 0)?.id).toBe(2);
    expect(findBestRate([invalid], input, new Map(), 0)).toBeNull();
  });

  it("returns no rate for an empty catalog", () => {
    expect(findBestRate([], { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" }, new Map(), 0)).toBeNull();
  });

  it("picks the bonus rate when payment method matches", () => {
    const rate = findBestRate(
      [baseLocal, bonusOnline],
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" },
      new Map(),
      0
    );
    expect(rate?.milesPerDollar).toBe(4.0);
  });

  it("falls back to base rate when cap is exhausted", () => {
    const periodSpend = new Map([[2, 1000]]); // bonus rate cap fully used
    const rate = findBestRate(
      [baseLocal, bonusOnline],
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" },
      periodSpend,
      0
    );
    expect(rate?.milesPerDollar).toBe(1.3);
  });

  it("falls back to base rate when payment method does not match", () => {
    const rate = findBestRate(
      [baseLocal, bonusOnline],
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "CONTACTLESS" },
      new Map(),
      0
    );
    expect(rate?.milesPerDollar).toBe(1.3);
  });

  it("respects merchant category inclusion", () => {
    const diningBonus = makeRate({
      id: 3,
      spendCategory: "LOCAL",
      merchantCategories: ["DINING"],
      milesPerDollar: 4.0,
    });
    const rate = findBestRate(
      [baseLocal, diningBonus],
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "CONTACTLESS", merchantCategory: "DINING" },
      new Map(),
      0
    );
    expect(rate?.milesPerDollar).toBe(4.0);
  });

  it("respects merchant category exclusion (Citi Rewards travel MCC)", () => {
    const bonusExcludeTravel = makeRate({
      id: 4,
      spendCategory: "LOCAL",
      paymentMethod: "CONTACTLESS",
      merchantCategories: [],
      excludedMerchantCategories: ["TRAVEL"],
      milesPerDollar: 4.0,
      monthlyCapSgd: 1000,
    });
    const rate = findBestRate(
      [baseLocal, bonusExcludeTravel],
      { amountSgd: 200, spendCategory: "LOCAL", paymentMethod: "CONTACTLESS", merchantCategory: "TRAVEL" },
      new Map(),
      0
    );
    expect(rate?.milesPerDollar).toBe(1.3); // excluded, falls back to base
  });

  it("respects minimum monthly spend unlock (Maybank Horizon)", () => {
    const unlockRate = makeRate({
      id: 5,
      spendCategory: "FOREIGN",
      milesPerDollar: 2.8,
      minimumMonthlySpendSgd: 800,
    });
    const baseForex = makeRate({ id: 6, spendCategory: "FOREIGN", milesPerDollar: 0.4 });

    // Below unlock threshold
    const rateBelow = findBestRate(
      [unlockRate, baseForex],
      { amountSgd: 100, spendCategory: "FOREIGN", paymentMethod: "PHYSICAL" },
      new Map(),
      500 // only $500 spent this month
    );
    expect(rateBelow?.milesPerDollar).toBe(0.4);

    // Above unlock threshold
    const rateAbove = findBestRate(
      [unlockRate, baseForex],
      { amountSgd: 100, spendCategory: "FOREIGN", paymentMethod: "PHYSICAL" },
      new Map(),
      900 // $900 spent this month — unlocked
    );
    expect(rateAbove?.milesPerDollar).toBe(2.8);
  });
});

// ─────────────────────────────────────────────
// splitAtCap
// ─────────────────────────────────────────────

describe("splitAtCap", () => {
  const bonusRate = makeRate({ id: 1, monthlyCapSgd: 1000, milesPerDollar: 4.0 });
  const baseRate = makeRate({ id: 2, monthlyCapSgd: null, milesPerDollar: 0.4 });

  it("entire amount earns bonus when under cap", () => {
    const { bonusAmount, baseAmount } = splitAtCap(100, bonusRate, baseRate, 500);
    expect(bonusAmount).toBe(100);
    expect(baseAmount).toBe(0);
  });

  it("splits correctly when transaction straddles the cap", () => {
    const { bonusAmount, baseAmount } = splitAtCap(100, bonusRate, baseRate, 950);
    expect(bonusAmount).toBe(50);  // $50 remaining cap
    expect(baseAmount).toBe(50);  // $50 overflow at base rate
  });

  it("entire amount at base rate when cap exhausted", () => {
    const { bonusAmount, baseAmount } = splitAtCap(100, bonusRate, baseRate, 1000);
    expect(bonusAmount).toBe(0);
    expect(baseAmount).toBe(100);
  });
});

// ─────────────────────────────────────────────
// calculateMiles — end-to-end scenarios
// ─────────────────────────────────────────────

describe("calculateMiles", () => {
  it("does not award overflow miles using an excluded or ineligible base rate", () => {
    const bonus = makeRate({ id: 2, paymentMethod: "ONLINE", monthlyCapSgd: 1000, milesPerDollar: 4, rewardPerDollar: 4 });
    const input = { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE", merchantCategory: "TRAVEL" } as const;
    const base = makeRate({ id: 1, milesPerDollar: 1, rewardPerDollar: 1 });
    expect(calculateMiles(makeCard({ earningRates: [base, bonus] }), input, new Map([[2, 950]]), 0, [1]).milesEarned).toBe(200);
    expect(calculateMiles(makeCard({ earningRates: [makeRate({ ...base, excludedMerchantCategories: ["TRAVEL"] }), bonus] }), input, new Map([[2, 950]]), 0).milesEarned).toBe(200);
    expect(calculateMiles(makeCard({ earningRates: [bonus] }), input, new Map([[2, 950]]), 0).milesEarned).toBe(200);
  });

  it("reports zero earnings with no applied rate when none is eligible", () => {
    const result = calculateMiles(makeCard({ earningRates: [makeRate({ id: 1 })] }), { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" }, new Map(), 0, [1]);
    expect(result).toMatchObject({ milesEarned: 0, rewardEarned: 0, effectiveMpd: 0, rateId: null, capRemaining: null });
  });
  it("DBS Altitude: 1.3 mpd local, no rounding", () => {
    const card = makeCard({
      rewardToMilesRate: 2.0,
      earningRates: [
        makeRate({ id: 1, spendCategory: "LOCAL", milesPerDollar: 1.3, rewardPerDollar: 0.65 }),
        makeRate({ id: 2, spendCategory: "FOREIGN", milesPerDollar: 2.2, rewardPerDollar: 1.1 }),
      ],
    });

    const result = calculateMiles(
      card,
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "CONTACTLESS" },
      new Map(),
      0
    );

    expect(result.milesEarned).toBe(130);
    expect(result.effectiveMpd).toBe(1.3);
    expect(result.billableAmount).toBe(100);
  });

  it("UOB PRVI Miles: 1.4 mpd local, $5 block rounding on $23", () => {
    const card = makeCard({
      slug: "uob-prvi-miles",
      bank: "UOB",
      rewardToMilesRate: 2.0,
      earningRates: [
        makeRate({
          id: 1,
          spendCategory: "LOCAL",
          milesPerDollar: 1.4,
          rewardPerDollar: 0.7,
          roundDownTo: 5,
        }),
      ],
    });

    const result = calculateMiles(
      card,
      { amountSgd: 23, spendCategory: "LOCAL", paymentMethod: "CONTACTLESS" },
      new Map(),
      0
    );

    expect(result.billableAmount).toBe(20);   // $23 → $20 after $5 rounding
    expect(result.rewardEarned).toBe(14);     // 20 * 0.7 = 14 UNI$
    expect(result.milesEarned).toBe(28);      // 14 UNI$ * 2 = 28 miles
    // effectiveMpd = 28/23 ≈ 1.217
    expect(result.effectiveMpd).toBeCloseTo(1.217, 2);
  });

  it("HSBC Revolution: 4 mpd online, cap split at $950 spent", () => {
    const baseLocal = makeRate({
      id: 1, spendCategory: "LOCAL", milesPerDollar: 0.4, rewardPerDollar: 1.0,
    });
    const bonusOnline = makeRate({
      id: 2,
      spendCategory: "LOCAL",
      paymentMethod: "ONLINE",
      milesPerDollar: 4.0,
      rewardPerDollar: 10.0,
      monthlyCapSgd: 1000,
    });
    const card = makeCard({
      slug: "hsbc-revolution",
      bank: "HSBC",
      rewardToMilesRate: 0.4, // 1 point = 0.4 miles (base partner)
      earningRates: [baseLocal, bonusOnline],
    });

    // $950 already spent on bonus rate this month, spending another $100
    const periodSpend = new Map([[2, 950]]);

    const result = calculateMiles(
      card,
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" },
      periodSpend,
      950
    );

    // $50 at 4 mpd = 200 miles; $50 at 0.4 mpd = 20 miles; total = 220 miles
    expect(result.milesEarned).toBe(220);
    expect(result.effectiveMpd).toBe(2.2);
    expect(result.capRemaining).toBe(0);
  });

  it("returns 0 miles when billable amount is 0 (UOB transaction under $5)", () => {
    const card = makeCard({
      earningRates: [
        makeRate({ id: 1, spendCategory: "LOCAL", milesPerDollar: 1.4, rewardPerDollar: 0.7, roundDownTo: 5 }),
      ],
    });

    const result = calculateMiles(
      card,
      { amountSgd: 4.99, spendCategory: "LOCAL", paymentMethod: "CONTACTLESS" },
      new Map(),
      0
    );

    expect(result.billableAmount).toBe(0);
    expect(result.milesEarned).toBe(0);
  });
});

// ─────────────────────────────────────────────
// rankCards
// ─────────────────────────────────────────────

describe("rankCards", () => {
  it("explains unavailable earning rules without presenting an ineligible rate", () => {
    const ranked = rankCards([{ userCardId: 1, cardSlug: "synthetic", cardName: "Synthetic", bank: "Example", card: makeCard({ earningRates: [] }), periodSpendByRateId: new Map(), totalMonthlySpend: 0, excludedRateIds: [] }], { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" });
    expect(ranked[0]).toMatchObject({ milesEarned: 0, effectiveMpd: 0, capExhausted: false });
    expect(ranked[0].reasoning).toMatch(/no eligible earning rate/i);
  });
  it("ranks cards by effective MPD descending", () => {
    const cardA = makeCard({
      id: 1, slug: "card-a", bank: "DBS",
      earningRates: [makeRate({ id: 1, spendCategory: "LOCAL", milesPerDollar: 1.3 })],
    });
    const cardB = makeCard({
      id: 2, slug: "card-b", bank: "HSBC",
      earningRates: [makeRate({ id: 2, spendCategory: "LOCAL", milesPerDollar: 4.0, paymentMethod: "ONLINE" })],
    });

    const ranked = rankCards(
      [
        { userCardId: 1, cardSlug: "card-a", cardName: "Card A", bank: "DBS", card: cardA, periodSpendByRateId: new Map(), totalMonthlySpend: 0, excludedRateIds: [] },
        { userCardId: 2, cardSlug: "card-b", cardName: "Card B", bank: "HSBC", card: cardB, periodSpendByRateId: new Map(), totalMonthlySpend: 0, excludedRateIds: [] },
      ],
      { amountSgd: 100, spendCategory: "LOCAL", paymentMethod: "ONLINE" }
    );

    expect(ranked[0].cardSlug).toBe("card-b");
    expect(ranked[1].cardSlug).toBe("card-a");
  });
});
