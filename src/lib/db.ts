import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
  dbInitialized: boolean | undefined;
};

export const pool = globalForPrisma.pool ?? new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

/**
 * Self-healing automatic schema bootstrap for PostgreSQL on Railway
 * Ensures all required tables and enums exist on first connect.
 */
export async function ensureDatabaseSchema() {
  if (globalForPrisma.dbInitialized) return;

  const initSql = `
    DO $$ BEGIN
      CREATE TYPE "Role" AS ENUM ('MENTEE', 'MENTOR', 'ADMIN');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'MATCHING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "PairStatus" AS ENUM ('PROPOSED', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'TERMINATED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "Employee" (
      "employeeCode" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "designation" TEXT NOT NULL,
      "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "role" "Role" NOT NULL DEFAULT 'MENTEE',
      "discStyle" TEXT,
      "discRawResponse" JSONB,
      "careerGoals" TEXT,
      "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "challenges" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "availability" TEXT,
      "commStyleNotes" TEXT,
      "isConsentShared" BOOLEAN NOT NULL DEFAULT false,
      "mentorCapacity" INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT "Employee_pkey" PRIMARY KEY ("employeeCode")
    );

    CREATE TABLE IF NOT EXISTS "Cohort" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" "CohortStatus" NOT NULL DEFAULT 'MATCHING',
      CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "MentoringPair" (
      "id" TEXT NOT NULL,
      "cohortId" TEXT NOT NULL,
      "menteeCode" TEXT NOT NULL,
      "mentorCode" TEXT NOT NULL,
      "status" "PairStatus" NOT NULL DEFAULT 'PROPOSED',
      "matchScore" DOUBLE PRECISION NOT NULL,
      "declineReason" TEXT,
      "sharedGoals" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MentoringPair_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL,
      "pairId" TEXT NOT NULL,
      "weekNumber" INTEGER NOT NULL,
      "scheduledTime" TIMESTAMP(3),
      "googleMeetLink" TEXT,
      "calendarEventId" TEXT,
      "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
      "preSessionNotes" TEXT,
      "discussionPoints" TEXT,
      "insights" TEXT,
      "commitments" TEXT,
      "supportNeeded" TEXT,
      "recordingUrl" TEXT,
      "isRecordingConsentGranted" BOOLEAN NOT NULL DEFAULT false,
      "postSessionReflectionMentee" TEXT,
      "postSessionReflectionMentor" TEXT,
      CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "SharedNotebook" (
      "id" TEXT NOT NULL,
      "pairId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "updatedBy" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SharedNotebook_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "PrivateNote" (
      "id" TEXT NOT NULL,
      "employeeCode" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PrivateNote_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "ActionItem" (
      "id" TEXT NOT NULL,
      "sessionId" TEXT,
      "employeeCode" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
      CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Resource" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "url" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "uploadedBy" TEXT NOT NULL,
      "isApproved" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "SurveyFeedback" (
      "id" TEXT NOT NULL,
      "pairId" TEXT NOT NULL,
      "employeeCode" TEXT NOT NULL,
      "weekNumber" INTEGER NOT NULL,
      "growthRating" INTEGER NOT NULL,
      "feedbackText" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SurveyFeedback_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entityId" TEXT,
      "performedBy" TEXT NOT NULL,
      "details" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );

    -- Ensure Admin Puja Singh exists in Employee table
    INSERT INTO "Employee" ("employeeCode", "name", "email", "role", "department", "designation", "joinDate", "isConsentShared")
    VALUES ('EMP001', 'Puja Singh', 'puja.singh@rdc.in', 'ADMIN', 'HR, L&D & Operational Excellence', 'Head of L&D and Operational Excellence', CURRENT_TIMESTAMP, true)
    ON CONFLICT ("employeeCode") DO NOTHING;
  `;

  try {
    await pool.query(initSql);
    globalForPrisma.dbInitialized = true;
    console.log('[DB] Self-healing PostgreSQL schema bootstrap completed successfully.');
  } catch (err) {
    console.error('[DB] Schema bootstrap error:', err);
  }
}

// Automatically trigger on startup
ensureDatabaseSchema().catch(() => {});
