-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('Prospect', 'Active', 'OnHold', 'Churned');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('Technical', 'Billing', 'Executive');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('New', 'Contacted', 'ProposalSent', 'Negotiation', 'Won', 'Lost');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('Price', 'Competitor', 'Timing', 'NoBudget', 'Other');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('Referral', 'Website', 'Outbound');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('Perpetual', 'Subscription', 'Leased');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT,
    "billingAddress" TEXT,
    "industryType" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'Prospect',
    "accountOwnerId" TEXT,
    "taxRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "contactType" "ContactType" NOT NULL,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'Website',
    "estimatedValue" DOUBLE PRECISION,
    "stage" "LeadStage" NOT NULL DEFAULT 'New',
    "lostReason" "LostReason",
    "convertedClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "LicenseType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "seats" INTEGER,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_companyName_idx" ON "Client"("companyName");

-- CreateIndex
CREATE INDEX "Lead_companyName_idx" ON "Lead"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
