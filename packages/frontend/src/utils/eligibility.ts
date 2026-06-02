/**
 * Cards that have earning rates gated behind external eligibility
 * (e.g. linked savings account, specific income tier).
 *
 * Each entry describes a toggle shown in My Cards → card settings.
 * `rateDescriptionMatch` is matched against the rate's description field
 * to find which rate IDs to exclude when the user doesn't qualify.
 */
export interface EligibilityRequirement {
  id: string;                   // unique key for the toggle
  question: string;             // shown to the user
  rateDescriptionMatch: string; // substring matched against EarningRate.description
}

export const CARD_ELIGIBILITY: Record<string, EligibilityRequirement[]> = {
  "uob-ladys-card": [
    {
      id: "hasSavingsAccount",
      question: "I have a linked UOB Lady's Savings Account",
      rateDescriptionMatch: "requires UOB Lady's Savings Account",
    },
  ],
};

/**
 * Given a card's earning rates, return the IDs that should be excluded
 * when the specified eligibility requirement is NOT met.
 */
export function getRateIdsForRequirement(
  rates: { id: number; description: string | null }[],
  req: EligibilityRequirement
): number[] {
  return rates
    .filter(r => r.description?.includes(req.rateDescriptionMatch))
    .map(r => r.id);
}
