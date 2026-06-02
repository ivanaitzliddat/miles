-- CreateTable
CREATE TABLE "PendingRateChange" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "earningRateDescription" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "PendingRateChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingRateChange_cardId_idx" ON "PendingRateChange"("cardId");

-- CreateIndex
CREATE INDEX "PendingRateChange_status_idx" ON "PendingRateChange"("status");

-- AddForeignKey
ALTER TABLE "PendingRateChange" ADD CONSTRAINT "PendingRateChange_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
