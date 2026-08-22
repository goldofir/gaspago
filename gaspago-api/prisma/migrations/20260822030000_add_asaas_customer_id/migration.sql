-- AlterTable
ALTER TABLE "User" ADD COLUMN     "asaasCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasCustomerId_key" ON "User"("asaasCustomerId");
