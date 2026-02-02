/**
 * Banks we support. Each bank has its own reward system.
 */
export enum Bank {
  DBS = "DBS",
  UOB = "UOB",
  CITI = "CITI",
}

/**
 * How each bank stores rewards internally.
 * - DBS uses "DBS Points" (convert to miles at a rate)
 * - UOB uses "UNI$" (convert to miles at a rate)
 * - Citi uses "Citi Miles" (already miles, 1:1)
 */
export enum RewardType {
  DBS_POINTS = "DBS_POINTS",
  UNI_DOLLAR = "UNI_DOLLAR",
  THANKYOU_POINTS = "THANKYOU_POINTS",
}

/**
 * Where the spending happens. Affects miles-per-dollar rate.
 * - LOCAL: SGD transactions in Singapore
 * - FOREIGN: Foreign currency transactions
 * - FOREIGN_ASEAN: Foreign currency in ASEAN countries (UOB gives bonus rates)
 */
export enum SpendCategory {
  LOCAL = "LOCAL",
  FOREIGN = "FOREIGN",
  FOREIGN_ASEAN = "FOREIGN_ASEAN",
}

/**
 * How the payment was made. Some cards give different rates
 * for different payment methods (e.g., contactless vs online).
 */
export enum PaymentMethod {
  APPLE_PAY = "APPLE_PAY",
  GOOGLE_PAY = "GOOGLE_PAY",
  SAMSUNG_PAY = "SAMSUNG_PAY",
  CONTACTLESS = "CONTACTLESS",
  ONLINE = "ONLINE",
  PHYSICAL = "PHYSICAL",
}

/**
 * An earning rate defines how many miles you get per dollar
 * for a specific combination of spend category and payment method.
 */
export interface EarningRate {
  spendCategory: SpendCategory;
  paymentMethod: PaymentMethod | null; // null = applies to all methods
  milesPerDollar: number;
  rewardPerDollar: number; // raw reward points per dollar
  roundDownTo?: number; // UOB rounds down to nearest $5 block
  description?: string;
}

/**
 * A credit card definition with all its earning rates.
 */
export interface CardDefinition {
  slug: string;
  bank: Bank;
  name: string;
  fullName: string;
  rewardType: RewardType;
  rewardUnit: string; // Display name: "DBS Points", "UNI$", "Citi Miles"
  rewardToMilesRate: number; // How many miles per 1 reward unit
  earningRates: EarningRate[];
}
