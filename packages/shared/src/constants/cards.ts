import {
  Bank,
  RewardType,
  SpendCategory,
  PaymentMethod,
  MerchantCategory,
  type CardDefinition,
} from "../types/card.js";

/**
 * All supported credit cards and their earning rates.
 *
 * This is the single source of truth for card data.
 * The backend seed script reads from here to populate the database.
 *
 * Data current as of March 2026. Sources: official bank pages, The MileLion,
 * Mainly Miles, SingSaver, and MoneySmart reviews.
 *
 * Key earning rates summary:
 * ─────────────────────────────────────────────────────────────────────────────
 * DBS Altitude Visa           1.3 / 2.2 mpd  (DBS Points → miles, ~$1.54 min)
 * DBS Altitude Amex           1.3 / 2.2 mpd  (same pool as Visa)
 * DBS Vantage                 1.5 / 2.2 mpd  (premium, non-waivable $600 fee)
 * DBS Woman's World           0.4 / 1.2 / 4.0 mpd online (capped $1,000/mo)
 * UOB PRVI Miles              1.4 / 2.4 / 3.0 mpd ASEAN ($5 blocks)
 * UOB KrisFlyer Visa          1.2 / 2.4 / 3.0 mpd SIA Group
 * UOB Visa Infinite Metal     1.4 / 2.4 mpd  ($5 blocks)
 * UOB Lady's Card             0.4 / 10 mpd chosen category (capped $1,000/mo)
 * Citi PremierMiles           1.2 / 2.2 mpd  (no cap, Citi Miles 1:1)
 * Citi Rewards                0.4 / 4.0 mpd online+contactless (capped $1,000/mo)
 * Citi Prestige               1.3 / 2.0 mpd  (no cap)
 * OCBC 90°N                   1.3 / 2.1 mpd  (Travel$ 1:1, $5 blocks)
 * OCBC VOYAGE                 1.3 / 2.2 mpd  (VOYAGE Miles 1:1, $5 blocks)
 * SCB Journey                 1.2 / 2.0 / 3.0 mpd online SGD (capped $1,000/mo)
 * SCB Visa Infinite           1.0 / 3.0 mpd  (1.4 / 3.0 with $2,000+ stmt spend)
 * HSBC Revolution             0.4 / 4.0 mpd contactless+online (capped $1,000/mo)
 * HSBC TravelOne              1.2 / 2.4 mpd  (KrisFlyer effective: 1.0 / 2.0 mpd)
 * Maybank Horizon Visa Sig    0.4–2.8 mpd    (TREATS Points 2.5:1, $5 blocks, $800 min)
 * Amex KrisFlyer              1.1 / 1.1 mpd  (direct KrisFlyer)
 * Amex KrisFlyer Ascend       1.2 / 1.2 mpd  (direct KrisFlyer)
 * BOC Elite Miles             1.4 / 2.8 mpd  (BOC Points 5:1 to KrisFlyer only)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const CARD_DEFINITIONS: CardDefinition[] = [
  // ═══════════════════════════════════════════════════
  // DBS CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "dbs-altitude-visa",
    bank: Bank.DBS,
    name: "Altitude Visa Signature",
    fullName: "DBS Altitude Visa Signature",
    rewardType: RewardType.DBS_POINTS,
    rewardUnit: "DBS Points",
    /**
     * DBS Altitude: earns 3.25 DBS Points per S$5 local = 0.65 pts/$ local.
     * 1 DBS Point = 2 miles (KrisFlyer/Asia Miles/Qantas).
     * Points do not expire. Min transaction ~S$1.54 to earn.
     * Rounding: transaction rounded down to whole dollar, divided by 5,
     * multiplied by points rate, result rounded down (NOT strict $5 blocks).
     */
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles", "Qantas Frequent Flyer", "AirAsia BIG Points"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.3,
        rewardPerDollar: 0.65,
        description: "1.3 mpd on local SGD spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 1.1,
        description: "2.2 mpd on foreign currency spend",
      },
    ],
    officialUrl: "https://www.dbs.com.sg/personal/cards/credit-cards/dbs-altitude-cards",
    notes:
      "DBS Points never expire. Conversion fee S$27.25 per transfer (waived for AirAsia until Feb 2026). " +
      "Auto-conversion to KrisFlyer available at S$43.60/year. " +
      "Rounding: amount rounded to whole dollar, divided by 5, multiplied by rate, then rounded down to whole points — " +
      "more generous than strict $5-block banks. Minimum earning transaction ~S$1.54.",
  },

  {
    slug: "dbs-altitude-amex",
    bank: Bank.DBS,
    name: "Altitude American Express",
    fullName: "DBS Altitude American Express",
    rewardType: RewardType.DBS_POINTS,
    rewardUnit: "DBS Points",
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles", "Qantas Frequent Flyer", "AirAsia BIG Points"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.3,
        rewardPerDollar: 0.65,
        description: "1.3 mpd on local SGD spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 1.1,
        description: "2.2 mpd on foreign currency spend",
      },
    ],
    officialUrl: "https://www.dbs.com.sg/personal/cards/credit-cards/dbs-altitude-cards",
    notes:
      "Same earning rates and DBS Points pool as DBS Altitude Visa. " +
      "Points pool across DBS cards on the same account. " +
      "Useful for merchants that do not accept Visa.",
  },

  {
    slug: "dbs-vantage",
    bank: Bank.DBS,
    name: "Vantage",
    fullName: "DBS Vantage Visa Infinite",
    rewardType: RewardType.DBS_POINTS,
    rewardUnit: "DBS Points",
    /**
     * DBS Vantage earns at a higher local rate (1.5 mpd) vs Altitude (1.3 mpd).
     * Same 1 DBS Point = 2 miles conversion and same partners.
     * 25,000 bonus miles credited each year with annual fee payment.
     * Annual fee S$599.50 — non-waivable from August 2026.
     * 3-year expiry on miles earned (unlike Altitude which has no expiry).
     */
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles", "Qantas Frequent Flyer", "AirAsia BIG Points"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.5,
        rewardPerDollar: 0.75,
        description: "1.5 mpd on local SGD spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 1.1,
        description: "2.2 mpd on foreign currency spend",
      },
    ],
    officialUrl: "https://www.dbs.com.sg/personal/cards/credit-cards/dbs-vantage-card",
    notes:
      "Premium card with S$599.50 annual fee. Non-waivable from 1 August 2026 (previously waived at S$60,000 annual spend). " +
      "Earns 25,000 bonus miles each year upon annual fee payment. " +
      "DBS Points earned have a 3-year expiry (unlike Altitude which never expires). " +
      "Minimum income S$120,000.",
  },

  {
    slug: "dbs-womans-world",
    bank: Bank.DBS,
    name: "Woman's World Mastercard",
    fullName: "DBS Woman's World Mastercard",
    rewardType: RewardType.DBS_POINTS,
    rewardUnit: "DBS Points",
    /**
     * Strong online card: 4 mpd on all online spend (any currency) capped at S$1,000/month.
     * Cap was S$2,000 → S$1,500 → S$1,000 (August 2025).
     * Base local: 0.4 mpd. Overseas (non-online): 1.2 mpd.
     * Online FCY transactions earn the 4 mpd rate (not the 1.2 mpd overseas rate).
     */
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles", "Qantas Frequent Flyer"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 0.2,
        description: "0.4 mpd on local non-online spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 0.6,
        description: "1.2 mpd on overseas (foreign currency) non-online spend",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: PaymentMethod.ONLINE,
        milesPerDollar: 4.0,
        rewardPerDollar: 2.0,
        monthlyCapSgd: 1000,
        description: "4.0 mpd on online spend (any currency), capped at S$1,000/month",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: PaymentMethod.ONLINE,
        milesPerDollar: 4.0,
        rewardPerDollar: 2.0,
        monthlyCapSgd: 1000,
        description: "4.0 mpd on online foreign currency spend (shares S$1,000/month cap with local online)",
      },
    ],
    officialUrl: "https://www.dbs.com.sg/personal/cards/credit-cards/dbs-woman-mastercard-card",
    notes:
      "Best used as an online spending card. The 4 mpd cap was reduced from S$1,500 to S$1,000/month in August 2025. " +
      "Online FCY transactions earn 4 mpd (not 1.2 mpd). Cap is tracked by transaction date, not posting date. " +
      "Annual fee S$196.20, waived year 1, subsequently waived with S$25,000 annual spend.",
  },

  // ═══════════════════════════════════════════════════
  // UOB CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "uob-prvi-miles-visa",
    bank: Bank.UOB,
    name: "PRVI Miles Visa",
    fullName: "UOB PRVI Miles Visa",
    rewardType: RewardType.UNI_DOLLAR,
    rewardUnit: "UNI$",
    /**
     * UOB PRVI Miles earns UNI$3.5 per S$5 local (= 1.4 mpd), UNI$6 per S$5 FCY (= 2.4 mpd),
     * UNI$7.5 per S$5 ASEAN FCY (MYR, IDR, THB, VND) (= 3.0 mpd).
     * 1 UNI$ = 2 miles when converted to KrisFlyer or other partners.
     * STRICT $5 blocks: transaction rounded down to nearest $5 before calculation.
     * Min transaction S$5 to earn any miles. For transactions <S$40, effective mpd
     * can be significantly lower than headline rate due to rounding.
     */
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "Air France-KLM Flying Blue",
      "British Airways Avios",
      "Etihad Guest",
      "EVA Air Infinity MileageLands",
      "Turkish Airlines Miles & Smiles",
      "Qantas Frequent Flyer",
      "Malaysian Airlines Enrich",
      "IHG One Rewards",
    ],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.4,
        rewardPerDollar: 0.7,
        roundDownTo: 5,
        description: "1.4 mpd on local SGD spend (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.4,
        rewardPerDollar: 1.2,
        roundDownTo: 5,
        description: "2.4 mpd on foreign currency spend (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN_ASEAN,
        paymentMethod: null,
        milesPerDollar: 3.0,
        rewardPerDollar: 1.5,
        roundDownTo: 5,
        description: "3.0 mpd on ASEAN FCY spend — MYR, IDR, THB, VND (S$5 blocks)",
      },
    ],
    officialUrl: "https://www.uob.com.sg/personal/cards/travel/prvi-miles-card.page",
    notes:
      "UOB rounds down to nearest S$5 per transaction before calculating UNI$. " +
      "Minimum earn transaction is S$5. Effective mpd on small transactions can be much lower. " +
      "Annual fee waived with S$50,000 annual spend. " +
      "Temporary Agoda bonus: 8 mpd on hotel bookings (valid May 2026). " +
      "Airport limo benefit removed from AMEX variant from 1 April 2026.",
  },

  {
    slug: "uob-krisflyer-visa",
    bank: Bank.UOB,
    name: "KrisFlyer Visa",
    fullName: "KrisFlyer UOB Credit Card",
    rewardType: RewardType.KRISFLYER_MILES,
    rewardUnit: "KrisFlyer Miles",
    /**
     * Earns KrisFlyer miles directly (no conversion needed).
     * 3 mpd on SIA Group (Singapore Airlines, Scoot, KrisShop, Kris+, Pelago).
     * 2.4 mpd on dining, food delivery, online shopping, online travel, transport —
     *   but only if you spent S$1,000+ on SIA Group in the current card membership year.
     * 1.2 mpd base rate on all other spend.
     * No UNI$ conversion. Miles credited to KrisFlyer account directly.
     */
    rewardToMilesRate: 1.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer"],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 1.2,
        roundDownTo: 5,
        description: "1.2 mpd base rate on all other local spend (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 1.2,
        roundDownTo: 5,
        description: "1.2 mpd base rate on all other foreign spend (S$5 blocks)",
      },
    ],
    officialUrl: "https://www.uob.com.sg/personal/cards/travel/krisflyer-card.page",
    notes:
      "Earns KrisFlyer miles directly — no conversion step. " +
      "3 mpd on Singapore Airlines, Scoot, KrisShop, Kris+ and Pelago (no cap). " +
      "2.4 mpd on dining, food delivery, online shopping, online travel and transport — " +
      "requires S$1,000+ in SIA Group spend within the card membership year to unlock. " +
      "KrisFlyer-only redemption (no other airline partners). " +
      "Annual fee S$196.20.",
  },

  {
    slug: "uob-visa-infinite-metal",
    bank: Bank.UOB,
    name: "Visa Infinite Metal",
    fullName: "UOB Visa Infinite Metal Card",
    rewardType: RewardType.UNI_DOLLAR,
    rewardUnit: "UNI$",
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "Air France-KLM Flying Blue",
      "British Airways Avios",
      "Etihad Guest",
      "EVA Air Infinity MileageLands",
      "Turkish Airlines Miles & Smiles",
      "Qantas Frequent Flyer",
      "Malaysian Airlines Enrich",
      "IHG One Rewards",
    ],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.4,
        rewardPerDollar: 0.7,
        roundDownTo: 5,
        description: "1.4 mpd on local SGD spend (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.4,
        rewardPerDollar: 1.2,
        roundDownTo: 5,
        description: "2.4 mpd on foreign currency spend (S$5 blocks)",
      },
    ],
    officialUrl: "https://www.uob.com.sg/personal/cards/privilege/visa-infinite-metal-card.page",
    notes:
      "Premium metal card. Annual fee S$654 (non-waivable). " +
      "Earns 25,000 renewal miles each year; 40,000 miles with S$100,000+ spend in prior year. " +
      "Same S$5 block rounding as all UOB cards. " +
      "FCY transactions via Singapore-based processors (e.g. Hotels.com) earn local rate (1.4 mpd). " +
      "Lounge visits trimmed to 12/year from June 2026. " +
      "Minimum income S$120,000.",
  },

  {
    slug: "uob-ladys-card",
    bank: Bank.UOB,
    name: "Lady's Card",
    fullName: "UOB Lady's Card",
    rewardType: RewardType.UNI_DOLLAR,
    rewardUnit: "UNI$",
    /**
     * Earns 10X UNI$ per S$5 on 1 chosen bonus category (or more with savings account pairing).
     * Without savings account: 4 mpd on chosen category (capped S$1,000/month).
     * With UOB Lady's Savings Account (min balance): up to 10 mpd on chosen category.
     * Base rate: 0.4 mpd on all other spend.
     * Bonus categories (choose 1 per quarter): Dining, Travel, Fashion, Beauty & Wellness,
     *   Family, Transport, Entertainment.
     */
    rewardToMilesRate: 2.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "Air France-KLM Flying Blue",
      "British Airways Avios",
      "Etihad Guest",
    ],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 0.2,
        roundDownTo: 5,
        description: "0.4 mpd on all spend outside chosen bonus category",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 0.2,
        roundDownTo: 5,
        description: "0.4 mpd on all spend outside chosen bonus category",
      },
      {
        // Card-only rate (no savings account needed): 4 mpd on chosen bonus category
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        merchantCategories: [
          MerchantCategory.DINING,
          MerchantCategory.TRAVEL,
          MerchantCategory.SHOPPING,     // "Fashion" maps to SHOPPING
          MerchantCategory.BEAUTY_WELLNESS,
          MerchantCategory.FAMILY,
          MerchantCategory.TRANSPORT,
          MerchantCategory.ENTERTAINMENT,
        ],
        milesPerDollar: 4.0,
        rewardPerDollar: 2.0,
        roundDownTo: 5,
        monthlyCapSgd: 1000,
        description: "4.0 mpd on chosen bonus category (S$1,000/month cap) — card-only rate",
      },
      {
        // Savings account tier: up to 10 mpd on chosen bonus category
        // Requires UOB Lady's Savings Account with minimum average balance.
        // Users without this account should exclude this rate via wallet settings.
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        merchantCategories: [
          MerchantCategory.DINING,
          MerchantCategory.TRAVEL,
          MerchantCategory.SHOPPING,
          MerchantCategory.BEAUTY_WELLNESS,
          MerchantCategory.FAMILY,
          MerchantCategory.TRANSPORT,
          MerchantCategory.ENTERTAINMENT,
        ],
        milesPerDollar: 10.0,
        rewardPerDollar: 5.0,
        roundDownTo: 5,
        monthlyCapSgd: 1000,
        description: "10.0 mpd on chosen bonus category (requires UOB Lady's Savings Account)",
      },
    ],
    officialUrl: "https://www.uob.com.sg/personal/cards/rewards/ladys-card/index.page",
    notes:
      "Earn up to 10 mpd on one chosen bonus category when paired with UOB Lady's Savings Account " +
      "(requires min monthly average balance; up to 6 bonus mpd from savings account). " +
      "Without savings account pairing: 4 mpd on chosen category, capped S$1,000/month. " +
      "Base rate of 0.4 mpd on everything else. " +
      "Bonus category changeable each quarter. Categories: Dining, Travel, Fashion, Beauty & Wellness, Family, Transport, Entertainment. " +
      "Annual fee S$196.20. Minimum income S$30,000.",
  },

  // ═══════════════════════════════════════════════════
  // CITI CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "citi-premiermiles",
    bank: Bank.CITI,
    name: "PremierMiles",
    fullName: "Citi PremierMiles Card",
    rewardType: RewardType.CITI_MILES,
    rewardUnit: "Citi Miles",
    /**
     * Citi Miles are already in miles denomination — 1 Citi Mile = 1 airline mile.
     * No conversion ratio needed. Transfer at 1:1 to all partners.
     * No monthly/annual earning cap.
     * Citi Miles never expire.
     * Min earn: rounded down to nearest S$1 per transaction.
     */
    rewardToMilesRate: 1.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "Qantas Frequent Flyer",
      "Qatar Airways Privilege Club",
      "Thai Airways Royal Orchid Plus",
      "EVA Air Infinity MileageLands",
      "Air France-KLM Flying Blue",
      "Etihad Guest",
      "Avianca LifeMiles",
      "Turkish Airlines Miles & Smiles",
      "IHG One Rewards",
    ],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 1.2,
        description: "1.2 mpd on local SGD spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 2.2,
        description: "2.2 mpd on foreign currency spend (increased from 2.0 mpd in Sep 2024)",
      },
    ],
    officialUrl: "https://www1.citibank.com.sg/credit-cards/travel/premiermiles-card",
    notes:
      "Citi Miles never expire. No earning cap. 10,000 renewal Citi Miles with annual fee payment (S$196.20). " +
      "11 transfer partners including 10 airlines + IHG Hotels. All transfers at 1:1 ratio. " +
      "Transfer fee S$27.25 per redemption. Min transfer 10,000 miles, then in 10,000 blocks. " +
      "Occasional Agoda bonus: ~6.2 mpd SGD / 7.2 mpd FCY (check current promotions). " +
      "Foreign transaction fee 3.25%.",
  },

  {
    slug: "citi-rewards",
    bank: Bank.CITI,
    name: "Rewards Card",
    fullName: "Citi Rewards Card",
    rewardType: RewardType.THANKYOU_POINTS,
    rewardUnit: "Citi ThankYou Points",
    /**
     * 10X Citi ThankYou Points on online and contactless (non-travel) transactions = 4 mpd.
     * Cap: 9,000 bonus points per statement month = S$1,000 spend at 4 mpd.
     * Base: 1 ThankYou Point per S$1 = 0.4 mpd.
     * 25,000 ThankYou Points = 10,000 KrisFlyer miles (2.5:1 ratio).
     * Rounding: rounded down to nearest S$1 per transaction.
     */
    rewardToMilesRate: 0.4, // 1 ThankYou Point = 0.4 miles (2.5 points = 1 mile)
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "Qantas Frequent Flyer",
      "Qatar Airways Privilege Club",
      "Thai Airways Royal Orchid Plus",
      "EVA Air Infinity MileageLands",
      "Air France-KLM Flying Blue",
      "Etihad Guest",
      "Avianca LifeMiles",
      "Turkish Airlines Miles & Smiles",
      "IHG One Rewards",
    ],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 1.0,
        description: "0.4 mpd (1 ThankYou Point per S$1) on non-bonus local spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 1.0,
        description: "0.4 mpd (1 ThankYou Point per S$1) on non-bonus foreign spend",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: PaymentMethod.ONLINE,
        milesPerDollar: 4.0,
        rewardPerDollar: 10.0,
        monthlyCapSgd: 1000,
        description: "4.0 mpd (10X ThankYou Points) on online non-travel spend, capped S$1,000/month",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: PaymentMethod.CONTACTLESS,
        milesPerDollar: 4.0,
        rewardPerDollar: 10.0,
        monthlyCapSgd: 1000,
        description: "4.0 mpd (10X ThankYou Points) on contactless non-travel spend (shares S$1,000/month cap)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: PaymentMethod.ONLINE,
        milesPerDollar: 4.0,
        rewardPerDollar: 10.0,
        monthlyCapSgd: 1000,
        description: "4.0 mpd (10X ThankYou Points) on online foreign spend (shares S$1,000/month cap)",
      },
    ],
    officialUrl: "https://www.citibank.com.sg/credit-cards/rewards/citi-rewards-card/",
    notes:
      "10X ThankYou Points = 4 mpd on online and contactless non-travel purchases, capped at S$1,000/month " +
      "(9,000 bonus points cap per statement). " +
      "Travel-related MCCs (airlines, hotels, travel agencies) do NOT earn 10X. " +
      "ThankYou Points transfer to miles at 2.5:1 (e.g. 25,000 pts = 10,000 KrisFlyer miles). " +
      "Amaze card linkage previously gave 4 mpd on in-person spend; Amaze now charges 1% fee (from Mar 2025). " +
      "Annual fee S$196.20, waived year 1.",
  },

  {
    slug: "citi-prestige",
    bank: Bank.CITI,
    name: "Prestige",
    fullName: "Citi Prestige Card",
    rewardType: RewardType.THANKYOU_POINTS,
    rewardUnit: "Citi ThankYou Points",
    /**
     * 3.25 ThankYou Points per S$1 local = 1.3 mpd.
     * 5 ThankYou Points per S$1 FCY = 2.0 mpd.
     * No earning cap. 32,000 renewal miles with annual fee.
     * Relationship bonus of 5–30% based on banking history.
     */
    rewardToMilesRate: 0.4,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "Qantas Frequent Flyer",
      "Qatar Airways Privilege Club",
      "Thai Airways Royal Orchid Plus",
      "EVA Air Infinity MileageLands",
      "Air France-KLM Flying Blue",
      "Etihad Guest",
      "Avianca LifeMiles",
      "Turkish Airlines Miles & Smiles",
      "IHG One Rewards",
    ],
    transferFeeSgd: 0, // Waived for Prestige
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.3,
        rewardPerDollar: 3.25,
        description: "1.3 mpd on local SGD spend (3.25 ThankYou Points per S$1)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.0,
        rewardPerDollar: 5.0,
        description: "2.0 mpd on foreign currency spend (5 ThankYou Points per S$1)",
      },
    ],
    officialUrl: "https://www1.citibank.com.sg/credit-cards/travel/prestige-card",
    notes:
      "Annual fee S$651.82, non-waivable. Minimum income S$120,000. " +
      "32,000 renewal miles credited each year upon annual fee payment. " +
      "Transfer fee waived for Prestige (vs S$27.25 for other Citi cards). " +
      "Relationship bonus 5–30% based on Citibank banking history. " +
      "No earning cap. ThankYou Points transfer at 2.5:1.",
  },

  // ═══════════════════════════════════════════════════
  // OCBC CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "ocbc-90n",
    bank: Bank.OCBC,
    name: "90°N Visa",
    fullName: "OCBC 90°N Card",
    rewardType: RewardType.OCBC_TRAVEL_DOLLARS,
    rewardUnit: "Travel$",
    /**
     * 1 Travel$ = 1 airline mile when converted (no devaluation in conversion ratio).
     * S$5 earning blocks (transactions below S$5 earn nothing).
     * Travel$ never expire. No conversion fee.
     * No earning cap for base rates.
     */
    rewardToMilesRate: 1.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "British Airways Avios",
      "Etihad Guest",
      "Air France-KLM Flying Blue",
      "United Airlines MileagePlus",
      "IHG One Rewards",
      "Accor Live Limitless",
      "Marriott Bonvoy",
    ],
    transferFeeSgd: 25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.3,
        rewardPerDollar: 1.3,
        roundDownTo: 5,
        description: "1.3 mpd (Travel$) on local SGD spend (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.1,
        rewardPerDollar: 2.1,
        roundDownTo: 5,
        description: "2.1 mpd (Travel$) on foreign currency spend (S$5 blocks)",
      },
    ],
    officialUrl: "https://www.ocbc.com/personal-banking/cards/90-degrees-travel-credit-card",
    notes:
      "Travel$ never expire. No earning cap on base rates. Conversion fee S$25 per transfer. " +
      "Periodic Agoda promotions: up to 7 mpd on hotel bookings. " +
      "Periodic overseas spend promotions: up to 5 mpd. " +
      "Travel$ can alternatively be redeemed as 1.2% cashback. " +
      "Annual fee S$196.20, waived year 1; 10,000 miles awarded on year-2 fee payment.",
  },

  {
    slug: "ocbc-voyage",
    bank: Bank.OCBC,
    name: "VOYAGE",
    fullName: "OCBC VOYAGE Card",
    rewardType: RewardType.OCBC_VOYAGE_MILES,
    rewardUnit: "VOYAGE Miles",
    /**
     * VOYAGE Miles: 1 VOYAGE Mile = 1 airline mile.
     * S$5 earning blocks.
     * VOYAGE Miles never expire.
     * Conversion fee S$25 per transfer.
     * Standard tier: 1.3 mpd local, 2.2 mpd FCY.
     * Premier tier (OCBC Premier clients, S$350K+ AUM): 1.6 mpd local, 2.2 mpd FCY.
     */
    rewardToMilesRate: 1.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "British Airways Avios",
      "Etihad Guest",
      "Air France-KLM Flying Blue",
      "United Airlines MileagePlus",
      "IHG One Rewards",
      "Accor Live Limitless",
      "Marriott Bonvoy",
    ],
    transferFeeSgd: 25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.3,
        rewardPerDollar: 1.3,
        roundDownTo: 5,
        description: "1.3 mpd on local SGD spend — Standard tier (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 2.2,
        roundDownTo: 5,
        description: "2.2 mpd on foreign currency spend (S$5 blocks)",
      },
    ],
    officialUrl: "https://www.ocbc.com/personal-banking/cards/voyage-credit-card-rewards.page",
    notes:
      "Standard tier: 1.3 mpd local, 2.2 mpd FCY. " +
      "Premier tier (invite-only for OCBC Premier clients with S$350K+ AUM): 1.6 mpd local, 2.2 mpd FCY. " +
      "VOYAGE Miles never expire. S$5 earning blocks (transactions <S$5 earn nothing). " +
      "Conversion fee S$25 per transfer. Annual fee S$488 (standard) / S$498 (Premier). " +
      "Fee waived at S$60,000 annual spend (standard) or S$30,000 (Premier).",
  },

  // ═══════════════════════════════════════════════════
  // STANDARD CHARTERED CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "scb-journey",
    bank: Bank.SCB,
    name: "Journey",
    fullName: "Standard Chartered Journey Card",
    rewardType: RewardType.SCB_360_REWARDS,
    rewardUnit: "360° Rewards Points",
    /**
     * 1.2 mpd local (3 SC Points per S$1), 2.0 mpd FCY (5 SC Points per S$1).
     * 3 mpd on online SGD transactions in specific MCCs (transport, groceries, delivery)
     *   — capped at S$1,000/month.
     * Conversion: 2.5 SC Points = 1 KrisFlyer mile.
     * No minimum spend, no overall cap on base rates.
     */
    rewardToMilesRate: 0.4, // 2.5 SC Points = 1 mile → 1 SC Point = 0.4 miles
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 3.0,
        description: "1.2 mpd on local SGD spend (3 SC Points per S$1)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.0,
        rewardPerDollar: 5.0,
        description: "2.0 mpd on foreign currency spend (5 SC Points per S$1)",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: PaymentMethod.ONLINE,
        milesPerDollar: 3.0,
        rewardPerDollar: 7.5,
        monthlyCapSgd: 1000,
        description: "3.0 mpd on online SGD spend in transport, groceries & delivery MCCs (capped S$1,000/month)",
      },
    ],
    officialUrl: "https://www.sc.com/sg/credit-cards/journey-credit-card/",
    notes:
      "Year-round 3 mpd on first S$1,000 of eligible online SGD spend per statement month " +
      "(specific MCCs: transport, groceries, food delivery). " +
      "Only 2 FFP transfer partners: KrisFlyer and Asia Miles (SCB dropped most partners in 2024). " +
      "Transfer fee S$27.25 per conversion. Min transfer 25,000 SC Points (10,000 miles). " +
      "Annual fee S$196.20, waived year 1 (fee-paying version earns 30,000 welcome miles). " +
      "Min income S$30,000.",
  },

  {
    slug: "scb-visa-infinite",
    bank: Bank.SCB,
    name: "Visa Infinite",
    fullName: "Standard Chartered Visa Infinite Card",
    rewardType: RewardType.SCB_360_REWARDS,
    rewardUnit: "360° Rewards Points",
    /**
     * Two-tier earn rate based on statement spend:
     * - Under S$2,000 in statement: 1 mpd local AND 1 mpd FCY
     * - S$2,000+ in statement: 1.4 mpd local, 3 mpd FCY
     * The bonus applies retroactively to all spending in that cycle once threshold is met.
     * Conversion: 2.5 SC Points = 1 KrisFlyer mile.
     */
    rewardToMilesRate: 0.4,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.0,
        rewardPerDollar: 2.5,
        description: "1.0 mpd on local SGD spend when statement total < S$2,000",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 1.0,
        rewardPerDollar: 2.5,
        description: "1.0 mpd on foreign currency spend when statement total < S$2,000",
      },
    ],
    officialUrl: "https://www.sc.com/sg/credit-cards/visa-infinite-credit-card/",
    notes:
      "Two-tier system based on total statement spend: " +
      "Under S$2,000: 1 mpd local and FCY. " +
      "S$2,000+ in a statement cycle: 1.4 mpd local and 3.0 mpd FCY (applies retroactively to full statement). " +
      "Effective rates for most users who hit S$2,000: 1.4 mpd local, 3.0 mpd FCY. " +
      "Only KrisFlyer and Asia Miles as FFP partners (dropped others in 2024). " +
      "Transfer fee S$27.25 per conversion. Min transfer 25,000 SC Points (10,000 miles). " +
      "Annual fee S$599.50, non-waivable (50,000 miles welcome bonus with annual fee + S$2,000 spend in 60 days). " +
      "Min income S$150,000.",
  },

  // ═══════════════════════════════════════════════════
  // HSBC CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "hsbc-revolution",
    bank: Bank.HSBC,
    name: "Revolution",
    fullName: "HSBC Revolution Credit Card",
    rewardType: RewardType.HSBC_REWARD_POINTS,
    rewardUnit: "HSBC Reward Points",
    /**
     * From 1 April 2026 (permanent):
     * - 10X Reward Points (4 mpd to most partners, 3.33 mpd to KrisFlyer) on:
     *   online & contactless: dining, shopping, travel, ride-hailing, taxis, memberships
     *   — capped at S$1,000/month (9,000 bonus points)
     * - 1X Reward Point (0.4 mpd) on all other spend
     * Enhanced tier with HSBC Everyday Global Account (S$50,000+ ADB):
     * - 20X Reward Points (8 mpd to most partners, 6.67 mpd to KrisFlyer)
     *   — capped at S$1,200/month (22,800 bonus points)
     *
     * Transfer ratios (as of 2026):
     * - Most partners: 25,000 pts = 10,000 miles (2.5:1) → 10X = 4 mpd
     * - KrisFlyer: 30,000 pts = 10,000 miles (3:1) → 10X = 3.33 mpd
     */
    rewardToMilesRate: 0.4, // Using KrisFlyer rate: 3 pts = 1 mile → 1 pt = 0.333 miles
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "British Airways Avios",
      "Air France-KLM Flying Blue",
      "Etihad Guest",
      "Qatar Airways Privilege Club",
      "EVA Air Infinity MileageLands",
      "Turkish Airlines Miles & Smiles",
      "Japan Airlines JAL Mileage Bank",
      "United Airlines MileagePlus",
      "Thai Airways Royal Orchid Plus",
      "Vietnam Airlines Lotusmiles",
      "Qantas Frequent Flyer",
      "IHG One Rewards",
      "Wyndham Rewards",
      "Marriott Bonvoy",
      "Accor Live Limitless",
    ],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 1.0,
        description: "0.4 mpd (1X Reward Point per S$1) on non-bonus spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 1.0,
        description: "0.4 mpd (1X Reward Point per S$1) on non-bonus FCY spend",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: PaymentMethod.ONLINE,
        milesPerDollar: 3.33, // KrisFlyer effective rate (30,000 pts : 10,000 miles = 3:1)
        rewardPerDollar: 10.0,
        monthlyCapSgd: 1000,
        description: "3.33 mpd (KrisFlyer) / 4.0 mpd (other partners) on online bonus categories, capped S$1,000/month",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: PaymentMethod.CONTACTLESS,
        milesPerDollar: 3.33,
        rewardPerDollar: 10.0,
        monthlyCapSgd: 1000,
        description: "3.33 mpd (KrisFlyer) / 4.0 mpd (other partners) on contactless bonus categories (shares S$1,000/month cap)",
      },
    ],
    officialUrl: "https://www.hsbc.com.sg/credit-cards/products/revolution/",
    notes:
      "From 1 April 2026 (permanent): 10X Reward Points (4 mpd to most partners) on eligible online and contactless " +
      "transactions in dining, shopping, travel, ride-hailing, taxis, memberships. " +
      "Capped at S$1,000/month (9,000 bonus points). " +
      "IMPORTANT: KrisFlyer transfer ratio is 30,000 pts : 10,000 miles (3:1) since Jan 2025 devaluation, " +
      "making effective bonus rate 3.33 mpd for KrisFlyer vs 4.0 mpd for other partners. " +
      "Enhanced 8 mpd tier (20X points) available for HSBC Everyday Global Account holders with S$50,000+ ADB, " +
      "capped at S$1,200/month (22,800 bonus points). " +
      "Card upgraded to Visa Signature from 1 April 2026. No annual fee.",
  },

  {
    slug: "hsbc-travelone",
    bank: Bank.HSBC,
    name: "TravelOne",
    fullName: "HSBC TravelOne Card",
    rewardType: RewardType.HSBC_REWARD_POINTS,
    rewardUnit: "HSBC Reward Points",
    /**
     * 3X Reward Points per S$1 local = 1.2 mpd (at 2.5:1 partners) or 1.0 mpd (KrisFlyer at 3:1)
     * 6X Reward Points per S$1 FCY = 2.4 mpd (at 2.5:1 partners) or 2.0 mpd (KrisFlyer at 3:1)
     * No earning cap.
     * KrisFlyer effective rates (post Jan 2025 devaluation): 1.0 mpd local, 2.0 mpd FCY.
     */
    rewardToMilesRate: 0.4, // Using 2.5:1 headline rate for general display
    primaryMilesPartner: "KrisFlyer",
    transferPartners: [
      "KrisFlyer",
      "Asia Miles",
      "British Airways Avios",
      "Air France-KLM Flying Blue",
      "Etihad Guest",
      "Qatar Airways Privilege Club",
      "EVA Air Infinity MileageLands",
      "Turkish Airlines Miles & Smiles",
      "Japan Airlines JAL Mileage Bank",
      "United Airlines MileagePlus",
      "Thai Airways Royal Orchid Plus",
      "Vietnam Airlines Lotusmiles",
      "Qantas Frequent Flyer",
      "IHG One Rewards",
      "Wyndham Rewards",
      "Marriott Bonvoy",
      "Accor Live Limitless",
    ],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2, // Headline: 2.5:1 partners. For KrisFlyer (3:1): 1.0 mpd effective
        rewardPerDollar: 3.0,
        description: "1.2 mpd local (headline, 2.5:1 partners) — 1.0 mpd effective for KrisFlyer (3:1 ratio)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.4, // Headline: 2.5:1 partners. For KrisFlyer (3:1): 2.0 mpd effective
        rewardPerDollar: 6.0,
        description: "2.4 mpd FCY (headline, 2.5:1 partners) — 2.0 mpd effective for KrisFlyer (3:1 ratio)",
      },
    ],
    officialUrl: "https://www.hsbc.com.sg/credit-cards/products/travelone/",
    notes:
      "Headline earn rates of 1.2 mpd local / 2.4 mpd FCY apply to partners with 25,000 pts : 10,000 miles ratio. " +
      "KrisFlyer transfer ratio was devalued to 30,000 pts : 10,000 miles (3:1) on 16 January 2025, " +
      "making effective KrisFlyer rate 1.0 mpd local and 2.0 mpd FCY. " +
      "Best value: use partners at 2.5:1 ratio (Asia Miles, British Airways Avios, Flying Blue etc.) for 1.2/2.4 mpd. " +
      "No earning cap. Most transfer partners can be transferred instantly. " +
      "Annual fee S$196.20. 12,000 renewal miles with annual fee payment. " +
      "20 transfer partners (most in Singapore market as of 2026).",
  },

  // ═══════════════════════════════════════════════════
  // MAYBANK CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "maybank-horizon-visa-signature",
    bank: Bank.MAYBANK,
    name: "Horizon Visa Signature",
    fullName: "Maybank Horizon Visa Signature Card",
    rewardType: RewardType.MAYBANK_TREATS,
    rewardUnit: "TREATS Points",
    /**
     * TREATS Points: 2.5 TREATS = 1 KrisFlyer mile.
     * S$5 earning blocks (min S$5 per transaction to earn).
     * Transfer fee S$27.25 per conversion to KrisFlyer.
     * Min transfer: 25,000 TREATS Points = 10,000 miles.
     *
     * Earn rates (effective Dec 2025):
     * Base (no min spend):
     *   - 1.2 mpd on dining, food delivery, supermarkets, transport, petrol,
     *     dept stores, selected retail, air tickets, hotels, cruises, travel packages (local)
     *   - 0.4 mpd on all other local SGD
     *   - 0.16 mpd on education, insurance, medical, rentals, professional services
     *     (capped S$3,000/month from Dec 2025; utilities excluded entirely)
     *   - 1.2 mpd on all FCY (without meeting S$800 threshold)
     *
     * With S$800+ monthly spend:
     *   - 2.8 mpd on air tickets (capped S$10,000/month; reverts to 1.2 mpd above cap)
     *   - 2.8 mpd on all FCY (uncapped)
     *   - Other categories remain at 1.2 mpd or 0.4 mpd
     */
    rewardToMilesRate: 0.4, // 2.5 TREATS = 1 mile → 1 TREATS = 0.4 miles
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer", "Asia Miles", "Malaysian Airlines Enrich", "AirAsia BIG Points"],
    transferFeeSgd: 27.25,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 0.4,
        rewardPerDollar: 1.0,
        roundDownTo: 5,
        description: "0.4 mpd on general local SGD spend (S$5 blocks)",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 3.0,
        roundDownTo: 5,
        description: "1.2 mpd on dining, food delivery, supermarkets, transport, petrol, dept stores, retail, hotels, cruises",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 3.0,
        roundDownTo: 5,
        description: "1.2 mpd on FCY spend (without S$800/month minimum spend)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.8,
        rewardPerDollar: 7.0,
        roundDownTo: 5,
        minimumMonthlySpendSgd: 800,
        description: "2.8 mpd on all FCY spend with S$800+ monthly spend (uncapped)",
      },
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 2.8,
        rewardPerDollar: 7.0,
        roundDownTo: 5,
        minimumMonthlySpendSgd: 800,
        monthlyCapSgd: 10000,
        description: "2.8 mpd on air tickets with S$800+ monthly spend (capped S$10,000/month)",
      },
    ],
    officialUrl: "https://www.maybank2u.com.sg/en/personal/cards/credit/maybank-horizon-visa-signature-card.page",
    notes:
      "S$800 minimum monthly spend unlocks: 2.8 mpd on air tickets (capped S$10,000/month) and 2.8 mpd on all FCY (uncapped). " +
      "Without S$800 min spend: 1.2 mpd on FCY and selected local categories; 0.4 mpd general local. " +
      "Education, insurance, medical, rentals, professional services: 0.16 mpd, capped S$3,000/month (from Dec 2025). " +
      "Utilities excluded from earning entirely (from Oct 2025). SimplyGo excluded. " +
      "S$5 earning blocks. Transfer fee S$27.25 to KrisFlyer (free for AirAsia BIG). " +
      "TREATS Points to KrisFlyer: 2.5:1 ratio. Min transfer 25,000 TREATS = 10,000 miles. " +
      "KrisFlyer miles expire 36 months after earn date. " +
      "Annual fee S$196.20, waived 3 years. Min income S$30,000.",
  },

  // ═══════════════════════════════════════════════════
  // AMERICAN EXPRESS (SINGAPORE-ISSUED) CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "amex-krisflyer",
    bank: Bank.AMEX,
    name: "KrisFlyer Credit Card",
    fullName: "American Express Singapore Airlines KrisFlyer Credit Card",
    rewardType: RewardType.KRISFLYER_MILES,
    rewardUnit: "KrisFlyer Miles",
    /**
     * Earns KrisFlyer miles directly — no conversion step.
     * 1.1 mpd on all eligible local and foreign spend.
     * 2.0 mpd on SIA Group (Singapore Airlines, Scoot, KrisShop, Pelago) — no cap.
     * 2.0 mpd on Grab Singapore (rides, GrabFood, GrabMart, GrabExpress) — capped S$200/month.
     * Note: FCY rate is same as local rate (1.1 mpd); no FCY bonus.
     */
    rewardToMilesRate: 1.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer"],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.1,
        rewardPerDollar: 1.1,
        description: "1.1 mpd on all eligible local SGD spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 1.1,
        rewardPerDollar: 1.1,
        description: "1.1 mpd on all eligible foreign currency spend (no FCY bonus)",
      },
    ],
    officialUrl: "https://www.americanexpress.com/sg/credit-cards/singapore-airlines-krisflyer-credit-card/",
    notes:
      "KrisFlyer miles earned directly — no points conversion. " +
      "2 mpd on Singapore Airlines, Scoot, KrisShop and Pelago (uncapped). " +
      "2 mpd on Grab Singapore transactions, capped at S$200/month. " +
      "No FCY bonus rate (1.1 mpd for both local and foreign). " +
      "Annual fee S$180.72, waived year 1. No annual fee from year 2 with 2 charges in first year. " +
      "Entry-level SIA co-brand card. Min income S$30,000.",
  },

  {
    slug: "amex-krisflyer-ascend",
    bank: Bank.AMEX,
    name: "KrisFlyer Ascend Credit Card",
    fullName: "American Express Singapore Airlines KrisFlyer Ascend Credit Card",
    rewardType: RewardType.KRISFLYER_MILES,
    rewardUnit: "KrisFlyer Miles",
    /**
     * Earns KrisFlyer miles directly.
     * 1.2 mpd on all eligible spend (local and FCY) — no FCY bonus.
     * 2.0 mpd on SIA Group (Singapore Airlines, Scoot, KrisShop, Pelago) — no cap.
     * 2.0 mpd on Grab Singapore — capped S$200/month.
     * 18,000 KrisFlyer mile voucher for S$10,000+ FCY spend (Nov 2025 – Oct 2026).
     */
    rewardToMilesRate: 1.0,
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer"],
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 1.2,
        description: "1.2 mpd on all eligible local SGD spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 1.2,
        description: "1.2 mpd on all eligible foreign currency spend (no FCY bonus)",
      },
    ],
    officialUrl: "https://www.americanexpress.com/sg/credit-cards/singapore-airlines-krisflyer-ascend-credit-card/",
    notes:
      "KrisFlyer miles earned directly — no points conversion. " +
      "2 mpd on Singapore Airlines, Scoot, KrisShop and Pelago (uncapped). " +
      "2 mpd on Grab Singapore transactions, capped at S$200/month. " +
      "No FCY bonus rate (1.2 mpd for both local and foreign). " +
      "18,000 KrisFlyer mile voucher when spending S$10,000+ in FCY between Nov 2025 – Oct 2026. " +
      "4 complimentary airport lounge visits per year. " +
      "Annual fee S$397.85. Min income S$50,000.",
  },

  // ═══════════════════════════════════════════════════
  // BANK OF CHINA (BOC) CARDS
  // ═══════════════════════════════════════════════════

  {
    slug: "boc-elite-miles",
    bank: Bank.BOC,
    name: "Elite Miles World Mastercard",
    fullName: "BOC Elite Miles World Mastercard",
    rewardType: RewardType.BOC_POINTS,
    rewardUnit: "BOC Points",
    /**
     * From 1 July 2025:
     * - 1.4 mpd local (BOC Points rate: 7 pts per S$1 local, 50,000 pts = 10,000 KrisFlyer)
     * - 2.8 mpd FCY (BOC Points rate: 14 pts per S$1 FCY)
     * - No minimum spend, no earning cap.
     *
     * BOC Points to KrisFlyer: 50,000 BOC Points = 10,000 miles (5:1 ratio).
     * Asia Miles removed from July 2025 — KrisFlyer ONLY transfer partner.
     * Transfer fee S$30.56 per conversion.
     *
     * Rounding: Total monthly local transactions summed to the cent, multiplied
     * by rate factor, rounded down. Not strict $5 blocks per transaction.
     */
    rewardToMilesRate: 0.2, // 5 BOC Points = 1 mile → 1 BOC Point = 0.2 miles
    primaryMilesPartner: "KrisFlyer",
    transferPartners: ["KrisFlyer"],
    transferFeeSgd: 30.56,
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.4,
        rewardPerDollar: 7.0,
        description: "1.4 mpd on local SGD spend (7 BOC Points per S$1)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.8,
        rewardPerDollar: 14.0,
        description: "2.8 mpd on foreign currency spend (14 BOC Points per S$1)",
      },
    ],
    officialUrl: "https://www.boccc.com.sg/personal/credit-card/elite-miles-world-mastercard/",
    notes:
      "Earn rates enhanced from 1 July 2025: 1.4 mpd local (was 1 mpd), 2.8 mpd FCY (was 2 mpd). " +
      "No minimum spend, no cap on base earn rates. " +
      "IMPORTANT: Only KrisFlyer as FFP transfer partner from July 2025 (Asia Miles removed). " +
      "BOC Points to KrisFlyer conversion: 50,000 BOC Points = 10,000 miles (5:1 ratio). " +
      "Transfer fee S$30.56 per conversion. Max 10 blocks (100,000 miles) per single transfer. " +
      "Rounding: BOC sums all monthly transactions before applying the ratio (not per-transaction $5 blocks). " +
      "Excludes CardUp and ipaymy transactions from July 2025. " +
      "Annual fee S$196.20.",
  },
];
