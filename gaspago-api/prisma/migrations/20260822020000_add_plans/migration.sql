-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "planId" TEXT;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the existing hardcoded Premium plan so /subscribe keeps working without a
-- manual admin step, and existing Subscription rows can be backfilled by an admin.
INSERT INTO "Plan" ("id", "name", "slug", "price", "billingCycle", "features", "isActive", "createdAt", "updatedAt")
VALUES ('plan_premium_seed', 'Premium', 'premium', 29.90, 'MONTHLY', ARRAY['Cashback FGOL maior a cada entrega', 'Prioridade na fila de entrega', 'Suporte prioritário'], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
