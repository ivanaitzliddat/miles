/**
 * Card Research Agent — uses Claude with web search to research unknown credit cards.
 *
 * Flow:
 *   1. User submits a card name they can't find in the catalog
 *   2. Claude searches the web for the card's official benefit page
 *   3. Claude extracts structured rate data (MPD, caps, reward type, etc.)
 *   4. Returns a draft CardDefinition for the user to review and confirm
 *   5. On confirmation, the card is saved to DB as DRAFT (pending admin approval)
 *
 * Security: API key is never logged or returned to the client.
 * Rate research is always presented for human review before DB insertion.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ─────────────────────────────────────────────
// Output schema — what we expect Claude to return
// ─────────────────────────────────────────────

export const EarningRateDraftSchema = z.object({
  spendCategory: z.enum(["LOCAL", "FOREIGN", "FOREIGN_ASEAN"]),
  paymentMethod: z.enum(["CONTACTLESS", "ONLINE", "PHYSICAL"]).nullable(),
  merchantCategories: z.array(z.string()).default([]),
  excludedMerchantCategories: z.array(z.string()).default([]),
  milesPerDollar: z.number(),
  rewardPerDollar: z.number(),
  roundDownTo: z.number().nullable(),
  monthlyCapSgd: z.number().nullable(),
  annualCapSgd: z.number().nullable(),
  minimumMonthlySpendSgd: z.number().nullable(),
  description: z.string().nullable(),
});

export const CardResearchResultSchema = z.object({
  found: z.boolean(),
  notFoundReason: z.string().nullable(),    // if found=false, why

  slug: z.string().nullable(),              // kebab-case e.g. "ocbc-titanium-rewards"
  bank: z.string().nullable(),              // must match Bank enum: DBS|UOB|CITI|OCBC|SCB|HSBC|MAYBANK|AMEX|BOC|OTHER
  name: z.string().nullable(),              // short name e.g. "Titanium Rewards"
  fullName: z.string().nullable(),          // full name e.g. "OCBC Titanium Rewards Card"
  rewardType: z.string().nullable(),        // reward currency type
  rewardUnit: z.string().nullable(),        // display name e.g. "OCBC$"
  rewardToMilesRate: z.number().nullable(), // miles per 1 reward unit
  primaryMilesPartner: z.string().nullable(),
  transferPartners: z.array(z.string()).default([]),
  transferFeeSgd: z.number().nullable(),
  officialUrl: z.string().nullable(),
  notes: z.string().nullable(),
  earningRates: z.array(EarningRateDraftSchema).default([]),

  // Research metadata
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  warnings: z.array(z.string()).default([]),  // things the user should manually verify
  sourceUrls: z.array(z.string()).default([]), // pages consulted during research
});

export type CardResearchResult = z.infer<typeof CardResearchResultSchema>;
export type EarningRateDraft = z.infer<typeof EarningRateDraftSchema>;

// ─────────────────────────────────────────────
// Agent
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert on Singapore credit cards and miles/rewards programmes.
Your job is to research a credit card and extract its earning rates in a structured format.

## What to find
For each card, extract:
1. Miles per dollar (MPD) for: local SGD spend, foreign currency spend, ASEAN FCY (if applicable)
2. Bonus rates for specific payment methods (contactless/online) or merchant categories (dining, travel, etc.)
3. Monthly or annual spending caps on bonus rates
4. Minimum monthly spend to unlock certain rates
5. Reward unit type and conversion rate to air miles
6. Transfer partners (which airline/hotel programmes)
7. Transfer fee (if any, in SGD)
8. Official card benefit page URL

## Singapore-specific context
- "Local" = SGD transactions in Singapore
- "Foreign" = foreign currency transactions anywhere
- "ASEAN FCY" = foreign currency in ASEAN countries (MYR, THB, IDR, VND) — some UOB cards give bonus rates here
- UOB and OCBC cards typically use S$5 spending blocks (roundDownTo: 5)
- DBS uses a more generous rounding (NOT strict S$5 blocks)
- Common reward currencies: DBS Points (2 miles each), UNI$ (2 miles each), OCBC$ (varies), HSBC Reward Points (varies by partner)

## Confidence levels
- HIGH: Official bank page confirmed, rates clearly stated
- MEDIUM: Rates from reputable review site (The MileLion, Mainly Miles, SingSaver) but not directly from bank
- LOW: Conflicting information found, or card is very new/discontinued

## Merchant categories (use these exact values)
DINING, TRAVEL, SIA_GROUP, PETROL, GROCERY, SHOPPING, TRANSPORT,
ENTERTAINMENT, BEAUTY_WELLNESS, EDUCATION, HEALTHCARE, UTILITIES,
ONLINE_SHOPPING, ONLINE_TRAVEL, FAMILY

## Bank values (use these exact values)
DBS, UOB, CITI, OCBC, SCB, HSBC, MAYBANK, AMEX, BOC, OTHER

## Important
- Always check the official bank page first, then cross-reference with review sites
- If you find conflicting rates, flag in warnings and use the lower/more conservative figure
- If the card appears to be discontinued or very old, note in warnings
- Be precise about caps — note whether a cap is per calendar month or per billing cycle
- Return found: false if you cannot find reliable information after searching`;

export async function researchCard(cardName: string): Promise<CardResearchResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Use Haiku for cost efficiency — card research is extraction, not complex reasoning.
  // Limit to 2 tool calls max to prevent runaway searches.
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    tools: [
      { type: "web_search_20260209", name: "web_search" },
    ],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: `Research this Singapore credit card: "${cardName}"

Do ONE web search only. Your entire response must be a single JSON object — no preamble, no explanation, no markdown. Start your response with { and end with }.
{"found":bool,"notFoundReason":null,"slug":"kebab-slug","bank":"DBS|UOB|CITI|OCBC|SCB|HSBC|MAYBANK|AMEX|BOC|OTHER","name":"short name","fullName":"full name","rewardType":"e.g. DBS_POINTS","rewardUnit":"e.g. DBS Points","rewardToMilesRate":2.0,"primaryMilesPartner":"KrisFlyer","transferPartners":[],"transferFeeSgd":null,"officialUrl":"url","notes":"key caveats","earningRates":[{"spendCategory":"LOCAL|FOREIGN|FOREIGN_ASEAN","paymentMethod":"CONTACTLESS|ONLINE|PHYSICAL|null","merchantCategories":[],"excludedMerchantCategories":[],"milesPerDollar":1.3,"rewardPerDollar":0.65,"roundDownTo":null,"monthlyCapSgd":null,"annualCapSgd":null,"minimumMonthlySpendSgd":null,"description":"short desc"}],"confidence":"HIGH|MEDIUM|LOW","warnings":[],"sourceUrls":[]}`,
      },
    ],
  });

  const finalMessage = await stream.finalMessage();

  // Extract the text response
  const textBlock = finalMessage.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from research agent.");
  }

  // Parse and validate the JSON response.
  // Claude sometimes adds a preamble before the JSON — extract the first { ... } block.
  let rawJson: unknown;
  try {
    const text = textBlock.text;

    // Try direct parse first
    let jsonStr = text.trim();

    // Strip markdown code fences if present
    jsonStr = jsonStr
      .replace(/^```json\s*/m, "")
      .replace(/^```\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    // If still not valid JSON, extract the first top-level { ... } block
    if (!jsonStr.startsWith("{")) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        jsonStr = text.slice(start, end + 1);
      }
    }

    rawJson = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Agent returned invalid JSON: ${textBlock.text.slice(0, 300)}`);
  }

  const result = CardResearchResultSchema.parse(rawJson);
  return result;
}
