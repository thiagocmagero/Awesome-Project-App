-- CreateEnum
CREATE TYPE "WorkspaceMemberType" AS ENUM ('BASIC', 'LICENSED');

-- CreateEnum
CREATE TYPE "WorkspaceMemberStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL', 'ONE_TIME');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "stripeProductId" TEXT;

-- AlterTable
ALTER TABLE "PlanPricing" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "pricePerExtraSeat" DOUBLE PRECISION,
ADD COLUMN     "stripeExtraSeatPriceId" TEXT,
ADD COLUMN     "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "memberType" "WorkspaceMemberType" NOT NULL DEFAULT 'BASIC',
    "status" "WorkspaceMemberStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "extraSeats" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeExtraSeatItemId" TEXT,
    "stripeStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "baseAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "extraSeatsAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "extraSeatsCount" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_publicId_key" ON "WorkspaceMember"("publicId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_status_idx" ON "WorkspaceMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_ownerId_email_key" ON "WorkspaceMember"("ownerId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_publicId_key" ON "Subscription"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicId_key" ON "Invoice"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

