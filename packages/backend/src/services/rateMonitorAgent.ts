/**
 * Rate Monitor Agent — checks each card's official URL for rate changes.
 *
 * Flow:
 *   1. Fetch all ACTIVE cards from DB
 *   2. For each card, ask Claude to read the official URL and extract current rates
 *   3. Diff extracted rates against what's stored in DB
 *   4. Save any differences as PendingRateChange rows
 *   5. Return a summary of what was found
 *
 * Designed to run weekly (via `make monitor` or a cron job).
 * Claude only reads the page — no DB writes happen until an admin approves.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import type { Card, EarningRate } from "@prisma/client";

// ── Extracted rate schema ─────────────────────────────────────────────────────

const ExtractedRateSchema = z.object({
  spendCategory: z.enum(["LOCAL", "FOREIGN", "FOREIGN_ASEAN"]),
  paymentMethod: z.enum(["CONTACTLESS", "ONLINE", "PHYSICAL"]).nullable(),
  merchantCategories: z.array(z.string()).default([]),
  milesPerDollar: z.number(),
  monthlyCapSgd: z.number().nullable(),
  minimumMonthlySpendSgd: z.number().nullable(),
  description: z.string(),
});

const ExtractedCardRatesSchema = z.object({
  found: z.boolean(),
  rates: z.array(ExtractedRateSchema).default([]),
  notes: z.string().nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  warnings: z.array(z.string()).default([]),
});

type ExtractedCardRates = z.infer<typeof ExtractedCardRatesSchema>;

export interface RateMonitorSummary {
  checkedCards: number;
  changesDetected: number;
  errors: string[];
  changes: Array<{
    cardName: string;
    field: string;
    rateDescription: string;
    oldValue: string;
    newValue: string;
  }>;
}

// ── Agent ─────────────────────────────────────────────────────────────────────

async function extractRatesFromPage(
  card: Card,
  client: Anthropic
): Promise<ExtractedCardRates | null> {
  if (!card.officialUrl) return null;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are an expert on Singapore credit card earning rates.
Extract the current miles-per-dollar (MPD) rates from the bank's official page.
Focus only on: local rate, foreign rate, ASEAN rate, any bonus category rates, spending caps, and minimum spend requirements.
Return ONLY valid JSON. Start your response with { and end with }.`,
      tools: [{ type: "web_fetch_20260209", name: "web_fetch" }],
      messages: [
        {
          role: "user",
          content: `Fetch this page and extract the current earning rates for the ${card.fullName}: ${card.officialUrl}

Return ONLY a JSON object:
{"found":bool,"rates":[{"spendCategory":"LOCAL|FOREIGN|FOREIGN_ASEAN","paymentMethod":"CONTACTLESS|ONLINE|PHYSICAL|null","merchantCategories":[],"milesPerDollar":0.0,"monthlyCapSgd":null,"minimumMonthlySpendSgd":null,"description":"short desc"}],"notes":null,"confidence":"HIGH|MEDIUM|LOW","warnings":[]}`,
        },
      ],
    });

    const finalMessage = await stream.finalMessage();
    const textBlock = finalMessage.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    // Extract JSON from response
    let jsonStr = textBlock.text.trim()
      .replace(/^```json\s*/m, "")
      .replace(/^```\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    if (!jsonStr.startsWith("{")) {
      const start = jsonStr.indexOf("{");
      const end = jsonStr.lastIndexOf("}");
      if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);
    }

    const raw = JSON.parse(jsonStr);
    return ExtractedCardRatesSchema.parse(raw);
  } catch {
    return null;
  }
}

function describeRate(rate: EarningRate): string {
  const parts: string[] = [rate.spendCategory];
  if (rate.paymentMethod) parts.push(rate.paymentMethod);
  if (rate.merchantCategories.length > 0) parts.push(rate.merchantCategories.join("/"));
  return parts.join(" · ");
}

function diffRates(
  cardId: number,
  cardName: string,
  dbRates: EarningRate[],
  extracted: ExtractedCardRates,
  sourceUrl: string
): Array<{
  cardId: number;
  field: string;
  earningRateDescription: string;
  oldValue: string;
  newValue: string;
  sourceUrl: string;
}> {
  const changes: ReturnType<typeof diffRates> = [];

  for (const extractedRate of extracted.rates) {
    // Find the matching DB rate by spendCategory + paymentMethod + merchantCategories
    const dbRate = dbRates.find(
      (r) =>
        r.spendCategory === extractedRate.spendCategory &&
        r.paymentMethod === (extractedRate.paymentMethod ?? null) &&
        JSON.stringify([...r.merchantCategories].sort()) ===
          JSON.stringify([...extractedRate.merchantCategories].sort())
    );

    if (!dbRate) {
      // New rate that doesn't exist in DB yet
      changes.push({
        cardId,
        field: "NEW_RATE",
        earningRateDescription: extractedRate.description,
        oldValue: "NOT IN DB",
        newValue: `${extractedRate.milesPerDollar} mpd`,
        sourceUrl,
      });
      continue;
    }

    // Check MPD
    if (Math.abs(dbRate.milesPerDollar - extractedRate.milesPerDollar) > 0.01) {
      changes.push({
        cardId,
        field: "milesPerDollar",
        earningRateDescription: describeRate(dbRate),
        oldValue: String(dbRate.milesPerDollar),
        newValue: String(extractedRate.milesPerDollar),
        sourceUrl,
      });
    }

    // Check monthly cap
    const dbCap = dbRate.monthlyCapSgd ?? null;
    const extractedCap = extractedRate.monthlyCapSgd ?? null;
    if (dbCap !== extractedCap) {
      changes.push({
        cardId,
        field: "monthlyCapSgd",
        earningRateDescription: describeRate(dbRate),
        oldValue: dbCap === null ? "no cap" : `S$${dbCap}`,
        newValue: extractedCap === null ? "no cap" : `S$${extractedCap}`,
        sourceUrl,
      });
    }

    // Check minimum spend
    const dbMin = dbRate.minimumMonthlySpendSgd ?? null;
    const extractedMin = extractedRate.minimumMonthlySpendSgd ?? null;
    if (dbMin !== extractedMin) {
      changes.push({
        cardId,
        field: "minimumMonthlySpendSgd",
        earningRateDescription: describeRate(dbRate),
        oldValue: dbMin === null ? "none" : `S$${dbMin}`,
        newValue: extractedMin === null ? "none" : `S$${extractedMin}`,
        sourceUrl,
      });
    }
  }

  return changes;
}

// ── Main monitor function ─────────────────────────────────────────────────────

export async function runRateMonitor(): Promise<RateMonitorSummary> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Only check cards that:
  // 1. Have users (someone actually has this card in their wallet)
  // 2. Haven't been verified in the last 14 days
  // This keeps costs low — no point checking cards nobody uses or recently verified ones.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const cards = await prisma.card.findMany({
    where: {
      status: "ACTIVE",
      officialUrl: { not: "" },
      userCards: { some: {} },               // at least one user has this card
      OR: [
        { lastVerifiedAt: null },
        { lastVerifiedAt: { lt: fourteenDaysAgo } },
      ],
    },
    include: { earningRates: true },
  });

  if (cards.length === 0) {
    console.log("No cards due for verification.");
    return { checkedCards: 0, changesDetected: 0, errors: [], changes: [] };
  }

  console.log(`${cards.length} card(s) due for verification.`);

  const summary: RateMonitorSummary = {
    checkedCards: 0,
    changesDetected: 0,
    errors: [],
    changes: [],
  };

  for (const card of cards) {
    console.log(`Checking ${card.fullName}...`);
    summary.checkedCards++;

    try {
      const extracted = await extractRatesFromPage(card, client);

      if (!extracted || !extracted.found) {
        summary.errors.push(`${card.fullName}: could not extract rates from ${card.officialUrl}`);
        continue;
      }

      const changes = diffRates(
        card.id,
        card.fullName,
        card.earningRates,
        extracted,
        card.officialUrl
      );

      if (changes.length === 0) {
        console.log(`  ✓ No changes`);
        continue;
      }

      // Save pending changes to DB
      for (const change of changes) {
        await prisma.pendingRateChange.create({ data: change });

        summary.changes.push({
          cardName: card.fullName,
          field: change.field,
          rateDescription: change.earningRateDescription,
          oldValue: change.oldValue,
          newValue: change.newValue,
        });

        console.log(`  ! ${change.field}: ${change.oldValue} → ${change.newValue}`);
      }

      summary.changesDetected += changes.length;

      // Mark card as OUTDATED until admin reviews
      await prisma.card.update({
        where: { id: card.id },
        data: { status: "OUTDATED" },
      });
    } catch (err) {
      summary.errors.push(
        `${card.fullName}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return summary;
}
