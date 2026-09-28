-- AlterTable
BEGIN;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "highestQualification" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;
COMMIT;
