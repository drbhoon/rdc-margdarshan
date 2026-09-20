-- Forward-only reconciliation of the original Prisma schema and the Railway bootstrap schema.
-- Run after a verified backup. Conflicting legacy rows abort the transaction; none are deleted.
BEGIN;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "challenges" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "googleSubject" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_googleSubject_key" ON "Employee"("googleSubject");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_email_key" ON "Employee"("email");
ALTER TABLE "MentoringPair" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MentoringPair" ADD COLUMN IF NOT EXISTS "isOffRecord" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MentoringPair" ADD COLUMN IF NOT EXISTS "resumeMentor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MentoringPair" ADD COLUMN IF NOT EXISTS "resumeMentee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MentoringPair" ADD COLUMN IF NOT EXISTS "mentorAcceptedAt" TIMESTAMP(3);
ALTER TABLE "MentoringPair" ADD COLUMN IF NOT EXISTS "menteeAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "agenda" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "Session_pairId_weekNumber_key" ON "Session"("pairId","weekNumber");
ALTER TABLE "PrivateNote" ADD COLUMN IF NOT EXISTS "pairId" TEXT;
ALTER TABLE "ActionItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ActionItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ActionItem" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "ActionItem" ADD COLUMN IF NOT EXISTS "evidence" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "contributedByCode" TEXT;
ALTER TABLE "Resource" ALTER COLUMN "url" DROP NOT NULL;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Resource' AND column_name='description') THEN
  UPDATE "Resource" SET content=description WHERE content IS NULL;
  ALTER TABLE "Resource" ALTER COLUMN category SET DEFAULT 'General';
  ALTER TABLE "Resource" ALTER COLUMN "uploadedBy" DROP NOT NULL;
  UPDATE "Resource" r SET "contributedByCode"=e."employeeCode" FROM "Employee" e WHERE r."contributedByCode" IS NULL AND r."uploadedBy"=e."employeeCode";
 END IF;
END $$;
ALTER TABLE "SurveyFeedback" ADD COLUMN IF NOT EXISTS "pairId" TEXT;
ALTER TABLE "SurveyFeedback" ALTER COLUMN "pairId" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyFeedback_pairId_employeeCode_weekNumber_key" ON "SurveyFeedback"("pairId","employeeCode","weekNumber");
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "performedByCode" TEXT;
ALTER TABLE "AuditLog" ALTER COLUMN "performedByCode" DROP NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AuditLog' AND column_name='createdAt') THEN
  UPDATE "AuditLog" SET timestamp="createdAt" WHERE timestamp IS NULL;
  ALTER TABLE "AuditLog" ALTER COLUMN entity SET DEFAULT 'COACHING';
  ALTER TABLE "AuditLog" ALTER COLUMN "performedBy" DROP NOT NULL;
  UPDATE "AuditLog" a SET "performedByCode"=e."employeeCode" FROM "Employee" e WHERE a."performedByCode" IS NULL AND a."performedBy"=e."employeeCode";
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AuditLog' AND column_name='details' AND data_type='jsonb') THEN
  ALTER TABLE "AuditLog" ALTER COLUMN details TYPE TEXT USING details::TEXT;
 END IF;
END $$;
UPDATE "AuditLog" SET timestamp=CURRENT_TIMESTAMP WHERE timestamp IS NULL;
UPDATE "AuditLog" SET details='{}' WHERE details IS NULL;
ALTER TABLE "AuditLog" ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AuditLog" ALTER COLUMN timestamp SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN details SET NOT NULL;
CREATE TABLE IF NOT EXISTS "AuthSession" (
 "tokenHash" TEXT PRIMARY KEY, "employeeCode" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuthSession_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("employeeCode") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AuthSession_employeeCode_idx" ON "AuthSession"("employeeCode");
CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE IF NOT EXISTS "CoachingMessage" (
 id TEXT PRIMARY KEY, "pairId" TEXT NOT NULL, "employeeCode" TEXT NOT NULL,
 "weekNumber" INTEGER NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
 mode TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CoachingMessage_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "MentoringPair"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='PrivateNote_pairId_fkey') THEN
  ALTER TABLE "PrivateNote" ADD CONSTRAINT "PrivateNote_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "MentoringPair"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='SurveyFeedback_pairId_fkey') THEN
  ALTER TABLE "SurveyFeedback" ADD CONSTRAINT "SurveyFeedback_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "MentoringPair"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
END $$;
COMMIT;
