-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PaymentEdit" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceAdjustment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "dealerId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEdit_paymentId_createdAt_idx" ON "PaymentEdit"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "BalanceAdjustment_customerId_date_idx" ON "BalanceAdjustment"("customerId", "date");

-- CreateIndex
CREATE INDEX "BalanceAdjustment_dealerId_date_idx" ON "BalanceAdjustment"("dealerId", "date");

-- AddForeignKey
ALTER TABLE "PaymentEdit" ADD CONSTRAINT "PaymentEdit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEdit" ADD CONSTRAINT "PaymentEdit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Balance entries belong to exactly one account and must change it.
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_one_account" CHECK (("customerId" IS NOT NULL) <> ("dealerId" IS NOT NULL));
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_nonzero_amount" CHECK ("amount" <> 0);
