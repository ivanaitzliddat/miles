import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { EarningRate } from "@prisma/client";

type Decision = "APPROVED" | "REJECTED";
type NumericField = "milesPerDollar" | "monthlyCapSgd" | "minimumMonthlySpendSgd";

function rateLabel(rate: EarningRate): string {
  const parts: string[] = [rate.spendCategory];
  if (rate.paymentMethod) parts.push(rate.paymentMethod);
  if (rate.merchantCategories.length) parts.push(rate.merchantCategories.join("/"));
  return parts.join(" · ");
}

export function parseReviewedValue(field: NumericField, raw: string): number | null {
  const value = raw.trim().toLowerCase();
  if ((value === "none" || value === "no cap") && field !== "milesPerDollar") return null;
  const numeric = value.replace(/^s\$/, "").replace(/\s*mpd$/, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(numeric)) {
    throw new AppError(409, "The suggested value needs manual review.");
  }
  const result = Number(numeric);
  if (!Number.isFinite(result)) throw new AppError(409, "The suggested value needs manual review.");
  return result;
}

/** Resolve a pending change atomically; never approve a change the schema cannot represent. */
export async function resolveRateChange(id: number, decision: Decision, resolvedBy: string) {
  return prisma.$transaction(async (tx) => {
    const change = await tx.pendingRateChange.findUnique({
      where: { id },
      include: { card: { include: { earningRates: true } } },
    });
    if (!change) throw new AppError(404, "Pending change not found.");
    if (change.status !== "PENDING") throw new AppError(409, "Change already resolved.");

    let selectedRate: EarningRate | undefined;
    let numericValue: number | null = null;
    if (decision === "APPROVED") {
      if (change.field === "NEW_RATE") {
        throw new AppError(409, "New rates need manual catalog review; this suggestion cannot be applied automatically.");
      }
      if (!["milesPerDollar", "monthlyCapSgd", "minimumMonthlySpendSgd"].includes(change.field)) {
        throw new AppError(409, "Unknown rate field; manual review required.");
      }
      const matches = change.card.earningRates.filter(
        (rate) => rate.description === change.earningRateDescription || rateLabel(rate) === change.earningRateDescription
      );
      if (matches.length !== 1) {
        throw new AppError(409, "Rate could not be matched uniquely; manual review required.");
      }
      selectedRate = matches[0];
      numericValue = parseReviewedValue(change.field as NumericField, change.newValue);
    }

    const claimed = await tx.pendingRateChange.updateMany({
      where: { id, status: "PENDING" },
      data: { status: decision, resolvedAt: new Date(), resolvedBy },
    });
    if (claimed.count !== 1) throw new AppError(409, "Change already resolved.");

    if (decision === "APPROVED" && selectedRate) {
      await tx.earningRate.update({
        where: { id: selectedRate.id },
        data: { [change.field]: numericValue },
      });
      await tx.rateHistory.create({
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
    }

    const remaining = await tx.pendingRateChange.count({
      where: { cardId: change.cardId, status: "PENDING" },
    });
    await tx.card.update({
      where: { id: change.cardId },
      data: { status: remaining ? "OUTDATED" : "ACTIVE", ...(remaining === 0 && { lastVerifiedAt: new Date() }) },
    });
    return change;
  });
}
