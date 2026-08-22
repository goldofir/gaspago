-- CreateEnum
CREATE TYPE "OnChainDirection" AS ENUM ('TO_USER', 'FROM_USER');

-- CreateEnum
CREATE TYPE "OnChainTransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "RedeemLock" AS ENUM ('NONE', 'PIX_LOCKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletApprovedAt" TIMESTAMP(3),
ADD COLUMN     "pendingOnChainAmount" DECIMAL(20,8) NOT NULL DEFAULT 0,
ADD COLUMN     "lastConsumptionAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OnChainTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "OnChainDirection" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "txHash" TEXT,
    "status" "OnChainTransferStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "OnChainTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryConversion" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "fgolAmount" DECIMAL(20,8) NOT NULL,
    "usdcAmount" DECIMAL(20,8) NOT NULL,
    "txHash" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "brlConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "brlAmount" DECIMAL(10,2),
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnChainTransfer_status_idx" ON "OnChainTransfer"("status");

-- CreateIndex
CREATE INDEX "OnChainTransfer_userId_idx" ON "OnChainTransfer"("userId");

-- AddForeignKey
ALTER TABLE "OnChainTransfer" ADD CONSTRAINT "OnChainTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
