/**
 * Seed script — populates the Card and EarningRate tables from the shared
 * CARD_DEFINITIONS constant. Run with: npm run db:seed (from backend package)
 *
 * Safe to re-run: uses upsert so existing records are updated, not duplicated.
 */

import { PrismaClient } from "@prisma/client";
import { CARD_DEFINITIONS } from "@miles-tracker/shared";
import type {
  SpendCategory,
  PaymentMethod,
  MerchantCategory,
} from "@miles-tracker/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding card catalog...\n");

  for (const def of CARD_DEFINITIONS) {
    // Upsert the Card row
    const card = await prisma.card.upsert({
      where: { slug: def.slug },
      update: {
        bank: def.bank,
        name: def.name,
        fullName: def.fullName,
        rewardType: def.rewardType,
        rewardUnit: def.rewardUnit,
        rewardToMilesRate: def.rewardToMilesRate,
        primaryMilesPartner: def.primaryMilesPartner,
        transferPartners: def.transferPartners,
        transferFeeSgd: def.transferFeeSgd ?? null,
        officialUrl: def.officialUrl,
        notes: def.notes ?? null,
        lastVerifiedAt: new Date(),
      },
      create: {
        slug: def.slug,
        bank: def.bank,
        name: def.name,
        fullName: def.fullName,
        rewardType: def.rewardType,
        rewardUnit: def.rewardUnit,
        rewardToMilesRate: def.rewardToMilesRate,
        primaryMilesPartner: def.primaryMilesPartner,
        transferPartners: def.transferPartners,
        transferFeeSgd: def.transferFeeSgd ?? null,
        officialUrl: def.officialUrl,
        notes: def.notes ?? null,
        status: "ACTIVE",
        lastVerifiedAt: new Date(),
      },
    });

    // Delete existing earning rates for this card and recreate them.
    // Simpler than diffing — earning rates are owned by the seed data.
    await prisma.earningRate.deleteMany({ where: { cardId: card.id } });

    for (const rate of def.earningRates) {
      await prisma.earningRate.create({
        data: {
          cardId: card.id,
          spendCategory: rate.spendCategory as SpendCategory,
          paymentMethod: (rate.paymentMethod as PaymentMethod) ?? null,
          merchantCategories: (rate.merchantCategories as MerchantCategory[]) ?? [],
          excludedMerchantCategories: (rate.excludedMerchantCategories as MerchantCategory[]) ?? [],
          milesPerDollar: rate.milesPerDollar,
          rewardPerDollar: rate.rewardPerDollar,
          roundDownTo: rate.roundDownTo ?? null,
          monthlyCapSgd: rate.monthlyCapSgd ?? null,
          annualCapSgd: rate.annualCapSgd ?? null,
          minimumMonthlySpendSgd: rate.minimumMonthlySpendSgd ?? null,
          description: rate.description ?? null,
        },
      });
    }

    console.log(`  ✓ ${def.fullName} (${def.earningRates.length} rates)`);
  }

  const cardCount = await prisma.card.count();
  const rateCount = await prisma.earningRate.count();
  console.log(`\nDone. ${cardCount} cards, ${rateCount} earning rates in DB.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
