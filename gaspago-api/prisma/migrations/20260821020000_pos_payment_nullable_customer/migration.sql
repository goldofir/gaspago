-- POS charges are created before a customer scans the QR code (AWAITING_SCAN),
-- and a guest scan may never link a real User. customerId can no longer be required.
ALTER TABLE "PosPayment" DROP CONSTRAINT IF EXISTS "PosPayment_customerId_fkey";
ALTER TABLE "PosPayment" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Clean up the placeholder value the old code path used to insert
UPDATE "PosPayment" SET "customerId" = NULL WHERE "customerId" IN ('pending', 'anonymous');
