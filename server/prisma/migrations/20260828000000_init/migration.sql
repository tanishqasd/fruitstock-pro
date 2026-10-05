CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "PaymentDirection" AS ENUM ('RECEIVED', 'PAID');
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');
CREATE TYPE "StockMovementType" AS ENUM ('OPENING', 'PURCHASE', 'SALE', 'DAMAGE', 'ADJUSTMENT');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "businessName" TEXT NOT NULL DEFAULT 'FruitStock Wholesale',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "variety" TEXT, "unit" TEXT NOT NULL DEFAULT 'kg',
  "purchaseRate" DECIMAL(12,2) NOT NULL DEFAULT 0, "sellingRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "avgCost" DECIMAL(12,2) NOT NULL DEFAULT 0, "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dealer" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT, "address" TEXT, "gstNumber" TEXT,
  "contactPerson" TEXT, "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT, "address" TEXT, "gstNumber" TEXT,
  "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0, "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paymentTerms" INTEGER NOT NULL DEFAULT 7, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL, "purchaseNo" TEXT NOT NULL, "invoiceNo" TEXT, "dealerId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "totalAmount" DECIMAL(12,2) NOT NULL,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, "pendingAmount" DECIMAL(12,2) NOT NULL, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseItem" (
  "id" TEXT NOT NULL, "purchaseId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL, "rate" DECIMAL(12,2) NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sale" (
  "id" TEXT NOT NULL, "saleNo" TEXT NOT NULL, "invoiceNo" TEXT, "customerId" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "totalAmount" DECIMAL(12,2) NOT NULL,
  "receivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, "pendingAmount" DECIMAL(12,2) NOT NULL,
  "costAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleItem" (
  "id" TEXT NOT NULL, "saleId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL, "rate" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "costRate" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL, "direction" "PaymentDirection" NOT NULL, "customerId" TEXT, "dealerId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL, "mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reference" TEXT, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockTransaction" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "type" "StockMovementType" NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL, "unitCost" DECIMAL(12,2), "reference" TEXT, "reason" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "category" TEXT NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Product_name_variety_key" ON "Product"("name", "variety");
CREATE UNIQUE INDEX "Purchase_purchaseNo_key" ON "Purchase"("purchaseNo");
CREATE INDEX "Purchase_dealerId_date_idx" ON "Purchase"("dealerId", "date");
CREATE UNIQUE INDEX "Sale_saleNo_key" ON "Sale"("saleNo");
CREATE INDEX "Sale_customerId_date_idx" ON "Sale"("customerId", "date");
CREATE INDEX "Payment_customerId_date_idx" ON "Payment"("customerId", "date");
CREATE INDEX "Payment_dealerId_date_idx" ON "Payment"("dealerId", "date");
CREATE INDEX "StockTransaction_productId_date_idx" ON "StockTransaction"("productId", "date");

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
