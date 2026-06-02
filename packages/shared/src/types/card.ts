/**
 * Banks we support. Each bank has its own reward system.
 */
export enum Bank {
  DBS = "DBS",
  UOB = "UOB",
  CITI = "CITI",
  OCBC = "OCBC",
  SCB = "SCB", // Standard Chartered Bank
  HSBC = "HSBC",
  MAYBANK = "MAYBANK",
  AMEX = "AMEX", // American Express (Singapore-issued)
  BOC = "BOC", // Bank of China
}

/**
 * How each bank stores rewards internally.
 * - DBS uses "DBS Points" (convert to miles at a rate)
 * - UOB uses "UNI$" (convert to miles at a rate)
 * - Citi uses "Citi Miles" (already miles, 1:1)
 * - OCBC 90°N uses "Travel$" (1 Travel$ = 1 mile)
 * - OCBC VOYAGE uses "VOYAGE Miles" (1 VOYAGE Mile = 1 mile)
 * - SCB uses "360° Rewards Points" (2.5 points = 1 mile)
 * - HSBC uses "Reward Points" (varies by partner; 2.5:1 for most, 3:1 for KrisFlyer)
 * - Maybank uses "TREATS Points" (2.5 TREATS = 1 KrisFlyer mile)
 * - Amex KrisFlyer/Ascend/HighFlyer earn KrisFlyer miles directly
 * - Amex Platinum uses "Membership Rewards" (2 MR = 1 KrisFlyer mile post-Feb 2026 devaluation)
 * - BOC uses "BOC Points" (5 BOC Points = 1 KrisFlyer mile)
 */
export enum RewardType {
  DBS_POINTS = "DBS_POINTS",
  UNI_DOLLAR = "UNI_DOLLAR",
  THANKYOU_POINTS = "THANKYOU_POINTS", // Citi ThankYou Points (used by Rewards card)
  CITI_MILES = "CITI_MILES",           // Citi Miles (used by PremierMiles & Prestige, already 1:1)
  OCBC_TRAVEL_DOLLARS = "OCBC_TRAVEL_DOLLARS", // OCBC 90°N Travel$
  OCBC_VOYAGE_MILES = "OCBC_VOYAGE_MILES",     // OCBC VOYAGE Miles
  SCB_360_REWARDS = "SCB_360_REWARDS",         // Standard Chartered 360° Rewards Points
  HSBC_REWARD_POINTS = "HSBC_REWARD_POINTS",   // HSBC Reward Points
  MAYBANK_TREATS = "MAYBANK_TREATS",           // Maybank TREATS Points
  KRISFLYER_MILES = "KRISFLYER_MILES",         // Direct KrisFlyer miles (Amex co-brands)
  AMEX_MR = "AMEX_MR",                         // Amex Membership Rewards
  BOC_POINTS = "BOC_POINTS",                   // BOC Bonus Points
  OTHER = "OTHER",                             // AI-researched cards with unknown reward type
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
 * How the payment was made.
 *
 * NOTE: CONTACTLESS covers physical card paywave AND all mobile wallets
 * (Apple Pay, Google Pay, Samsung Pay). Banks receive identical transaction
 * data for all NFC tap payments and cannot distinguish between them.
 * No Singapore miles card currently differentiates Apple Pay from a
 * physical tap for base earning rates.
 */
export enum PaymentMethod {
  CONTACTLESS = "CONTACTLESS", // physical paywave + Apple Pay + Google Pay + Samsung Pay
  ONLINE = "ONLINE",           // online / card-not-present transactions
  PHYSICAL = "PHYSICAL",       // chip insert or magnetic swipe (non-contactless)
}

/**
 * The type of merchant where the spend occurs.
 * Used by cards that grant bonus rates on specific spending categories
 * (e.g. HSBC Revolution on dining, UOB Lady's on chosen category).
 *
 * An EarningRate with no merchantCategories applies to ALL merchant types.
 * An EarningRate with merchantCategories only applies to those specific types.
 */
export enum MerchantCategory {
  DINING = "DINING",                     // restaurants, cafes, food delivery
  TRAVEL = "TRAVEL",                     // airlines, hotels, travel agencies
  SIA_GROUP = "SIA_GROUP",               // Singapore Airlines, Scoot, KrisShop, Kris+, Pelago
  PETROL = "PETROL",                     // petrol stations
  GROCERY = "GROCERY",                   // supermarkets, grocery stores
  SHOPPING = "SHOPPING",                 // retail, fashion, department stores
  TRANSPORT = "TRANSPORT",               // taxis, ride-hailing (Grab, Gojek), MRT/bus
  ENTERTAINMENT = "ENTERTAINMENT",       // cinemas, attractions, events
  BEAUTY_WELLNESS = "BEAUTY_WELLNESS",   // spas, salons, gyms
  EDUCATION = "EDUCATION",               // schools, online courses
  HEALTHCARE = "HEALTHCARE",             // hospitals, clinics, pharmacies
  UTILITIES = "UTILITIES",              // electricity, telco, streaming
  ONLINE_SHOPPING = "ONLINE_SHOPPING",   // online retail specifically (some cards split this)
  ONLINE_TRAVEL = "ONLINE_TRAVEL",       // online hotel/flight bookings specifically
  FAMILY = "FAMILY",                     // children's goods and services (UOB Lady's category)
}

/**
 * An earning rate defines how many miles you get per dollar for a specific
 * combination of spend category, payment method, and merchant category.
 *
 * Matching logic (all non-null conditions must match for the rate to apply):
 *   spendCategory       — LOCAL / FOREIGN / FOREIGN_ASEAN
 *   paymentMethod       — null means any payment method
 *   merchantCategories  — null/empty means any merchant type;
 *                         non-empty means spend must be at one of these merchant types
 *   excludedMerchantCategories — merchant types explicitly excluded from this rate
 *                         (e.g. Citi Rewards excludes travel MCCs from 4 mpd bonus)
 */
export interface EarningRate {
  spendCategory: SpendCategory;
  paymentMethod: PaymentMethod | null;
  merchantCategories?: MerchantCategory[];         // if set, rate only applies to these merchants
  excludedMerchantCategories?: MerchantCategory[]; // if set, rate never applies to these merchants
  milesPerDollar: number;
  rewardPerDollar: number;
  roundDownTo?: number;          // UOB/OCBC/Maybank: round transaction down to nearest $X before calc
  monthlyCapSgd?: number;        // max SGD spend eligible for this rate per calendar month
  annualCapSgd?: number;         // max SGD spend eligible for this rate per year
  minimumMonthlySpendSgd?: number; // min monthly spend to unlock this rate (e.g. Maybank Horizon S$800)
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
  rewardUnit: string; // Display name: "DBS Points", "UNI$", "Citi Miles", etc.
  rewardToMilesRate: number; // How many miles per 1 reward unit (to primary partner)
  primaryMilesPartner: string; // Primary transfer/earn partner e.g. "KrisFlyer", "Asia Miles"
  transferPartners: string[]; // All supported airline/hotel programmes
  transferFeeSgd?: number; // SGD fee charged per conversion (e.g. S$27.25)
  earningRates: EarningRate[];
  officialUrl: string; // Bank's official card benefits/earn-rate page
  notes?: string; // Any special conditions not captured elsewhere
}
