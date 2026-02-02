import {
  Bank,
  RewardType,
  SpendCategory,
  type CardDefinition,
} from "../types/card.js";

/**
 * All supported credit cards and their earning rates.
 *
 * This is the single source of truth for card data.
 * The backend seed script reads from here to populate the database.
 *
 * Miles-per-dollar (mpd) rates as of 2025:
 * - DBS Altitude Visa: 1.3 mpd local, 2.2 mpd foreign
 * - UOB PRVI Miles: 1.4 mpd local, 2.4 mpd foreign, 3.0 mpd ASEAN
 * - Citi PremierMiles: 1.2 mpd local, 2.2 mpd foreign
 */
export const CARD_DEFINITIONS: CardDefinition[] = [
  {
    slug: "dbs-altitude-visa",
    bank: Bank.DBS,
    name: "Altitude Visa Signature",
    fullName: "DBS Altitude Visa Signature",
    rewardType: RewardType.DBS_POINTS,
    rewardUnit: "DBS Points",
    rewardToMilesRate: 2.0, // 1 DBS Point = 2 miles (for Altitude card)
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.3,
        rewardPerDollar: 0.65, // 0.65 DBS Points * 2 = 1.3 miles
        description: "1.3 mpd on local spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 1.1, // 1.1 DBS Points * 2 = 2.2 miles
        description: "2.2 mpd on foreign currency spend",
      },
    ],
  },
  {
    slug: "uob-prvi-miles",
    bank: Bank.UOB,
    name: "PRVI Miles",
    fullName: "UOB PRVI Miles",
    rewardType: RewardType.UNI_DOLLAR,
    rewardUnit: "UNI$",
    rewardToMilesRate: 2.0, // 1 UNI$ = 2 miles
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.4,
        rewardPerDollar: 0.7, // 0.7 UNI$ * 2 = 1.4 miles
        roundDownTo: 5, // UOB rounds down to nearest $5
        description: "1.4 mpd on local spend (rounded to $5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.4,
        rewardPerDollar: 1.2, // 1.2 UNI$ * 2 = 2.4 miles
        roundDownTo: 5,
        description: "2.4 mpd on foreign spend (rounded to $5 blocks)",
      },
      {
        spendCategory: SpendCategory.FOREIGN_ASEAN,
        paymentMethod: null,
        milesPerDollar: 3.0,
        rewardPerDollar: 1.5, // 1.5 UNI$ * 2 = 3.0 miles
        roundDownTo: 5,
        description: "3.0 mpd on ASEAN foreign spend (rounded to $5 blocks)",
      },
    ],
  },
  {
    slug: "citi-premiermiles",
    bank: Bank.CITI,
    name: "PremierMiles",
    fullName: "Citi PremierMiles",
    rewardType: RewardType.THANKYOU_POINTS,
    rewardUnit: "Citi Miles",
    rewardToMilesRate: 1.0, // Citi Miles are already miles (1:1)
    earningRates: [
      {
        spendCategory: SpendCategory.LOCAL,
        paymentMethod: null,
        milesPerDollar: 1.2,
        rewardPerDollar: 1.2, // 1.2 Citi Miles * 1 = 1.2 miles
        description: "1.2 mpd on local spend",
      },
      {
        spendCategory: SpendCategory.FOREIGN,
        paymentMethod: null,
        milesPerDollar: 2.2,
        rewardPerDollar: 2.2, // 2.2 Citi Miles * 1 = 2.2 miles
        description: "2.2 mpd on foreign currency spend",
      },
    ],
  },
];
