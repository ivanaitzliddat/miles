import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  pendingRateChange: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  earningRate: { update: vi.fn() },
  rateHistory: { create: vi.fn() },
  card: { update: vi.fn() },
}));

vi.mock("../lib/prisma.js", () => ({
  default: { $transaction: vi.fn((callback: (tx: typeof db) => Promise<unknown>) => callback(db)) },
}));

import { resolveRateChange } from "./rateChangeReview.js";

function pendingChange(field = "milesPerDollar", description = "LOCAL base rate") {
  return {
    id: 7,
    cardId: 3,
    status: "PENDING",
    field,
    earningRateDescription: description,
    oldValue: "1.2",
    newValue: "1.5",
    sourceUrl: "https://example.com/rates",
    card: {
      fullName: "Example card",
      earningRates: [{
        id: 11,
        description: "LOCAL base rate",
        spendCategory: "LOCAL",
        paymentMethod: null,
        merchantCategories: [],
      }],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.pendingRateChange.updateMany.mockResolvedValue({ count: 1 });
  db.pendingRateChange.count.mockResolvedValue(0);
});

describe("administrator rate review", () => {
  it("does not resolve a new rate that needs manual catalog changes", async () => {
    db.pendingRateChange.findUnique.mockResolvedValue(pendingChange("NEW_RATE"));
    await expect(resolveRateChange(7, "APPROVED", "42")).rejects.toMatchObject({ statusCode: 409 });
    expect(db.pendingRateChange.updateMany).not.toHaveBeenCalled();
    expect(db.earningRate.update).not.toHaveBeenCalled();
  });

  it("does not silently approve an unmatched existing rate", async () => {
    db.pendingRateChange.findUnique.mockResolvedValue(pendingChange("milesPerDollar", "Unknown rate"));
    await expect(resolveRateChange(7, "APPROVED", "42")).rejects.toMatchObject({ statusCode: 409 });
    expect(db.pendingRateChange.updateMany).not.toHaveBeenCalled();
  });

  it("applies a matched value and keeps the card outdated while another change is pending", async () => {
    db.pendingRateChange.findUnique.mockResolvedValue(pendingChange());
    db.pendingRateChange.count.mockResolvedValue(1);
    await resolveRateChange(7, "APPROVED", "42");
    expect(db.earningRate.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { milesPerDollar: 1.5 },
    });
    expect(db.rateHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ approvedBy: "42" }),
    }));
    expect(db.card.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { status: "OUTDATED" },
    });
  });

  it("rejects without changing the rate and restores the card when review is clear", async () => {
    db.pendingRateChange.findUnique.mockResolvedValue(pendingChange());
    await resolveRateChange(7, "REJECTED", "42");
    expect(db.earningRate.update).not.toHaveBeenCalled();
    expect(db.card.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { status: "ACTIVE", lastVerifiedAt: expect.any(Date) },
    });
  });
});
