-- CreateEnum
CREATE TYPE "Bank" AS ENUM ('DBS', 'UOB', 'CITI', 'OCBC', 'SCB', 'HSBC', 'MAYBANK', 'AMEX', 'BOC');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DBS_POINTS', 'UNI_DOLLAR', 'THANKYOU_POINTS', 'CITI_MILES', 'OCBC_TRAVEL_DOLLARS', 'OCBC_VOYAGE_MILES', 'SCB_360_REWARDS', 'HSBC_REWARD_POINTS', 'MAYBANK_TREATS', 'KRISFLYER_MILES', 'AMEX_MR', 'BOC_POINTS');

-- CreateEnum
CREATE TYPE "SpendCategory" AS ENUM ('LOCAL', 'FOREIGN', 'FOREIGN_ASEAN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CONTACTLESS', 'ONLINE', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "MerchantCategory" AS ENUM ('DINING', 'TRAVEL', 'SIA_GROUP', 'PETROL', 'GROCERY', 'SHOPPING', 'TRANSPORT', 'ENTERTAINMENT', 'BEAUTY_WELLNESS', 'EDUCATION', 'HEALTHCARE', 'UTILITIES', 'ONLINE_SHOPPING', 'ONLINE_TRAVEL', 'FAMILY');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'OUTDATED');

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "bank" "Bank" NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardUnit" TEXT NOT NULL,
    "rewardToMilesRate" DOUBLE PRECISION NOT NULL,
    "primaryMilesPartner" TEXT NOT NULL,
    "transferPartners" TEXT[],
    "transferFeeSgd" DOUBLE PRECISION,
    "officialUrl" TEXT NOT NULL,
    "notes" TEXT,
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningRate" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "spendCategory" "SpendCategory" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "merchantCategories" "MerchantCategory"[],
    "excludedMerchantCategories" "MerchantCategory"[],
    "milesPerDollar" DOUBLE PRECISION NOT NULL,
    "rewardPerDollar" DOUBLE PRECISION NOT NULL,
    "roundDownTo" INTEGER,
    "monthlyCapSgd" DOUBLE PRECISION,
    "annualCapSgd" DOUBLE PRECISION,
    "minimumMonthlySpendSgd" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarningRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateHistory" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCard" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "nickname" TEXT,
    "billingCycleStartDay" INTEGER NOT NULL DEFAULT 1,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userCardId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "amountSgd" DOUBLE PRECISION NOT NULL,
    "spendCategory" "SpendCategory" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "merchantCategory" "MerchantCategory",
    "description" TEXT,
    "merchantName" TEXT,
    "rewardEarned" DOUBLE PRECISION NOT NULL,
    "milesEarned" DOUBLE PRECISION NOT NULL,
    "effectiveMpd" DOUBLE PRECISION NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_slug_key" ON "Card"("slug");

-- CreateIndex
CREATE INDEX "EarningRate_cardId_idx" ON "EarningRate"("cardId");

-- CreateIndex
CREATE INDEX "RateHistory_cardId_idx" ON "RateHistory"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "UserCard_userId_idx" ON "UserCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCard_userId_cardId_key" ON "UserCard"("userId", "cardId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userCardId_idx" ON "Transaction"("userCardId");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- AddForeignKey
ALTER TABLE "EarningRate" ADD CONSTRAINT "EarningRate_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userCardId_fkey" FOREIGN KEY ("userCardId") REFERENCES "UserCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
