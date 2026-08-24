-- CreateEnum
CREATE TYPE "WaDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "direction" "WaDirection" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaMessage_phone_idx" ON "WaMessage"("phone");

-- CreateIndex
CREATE INDEX "WaMessage_createdAt_idx" ON "WaMessage"("createdAt");
