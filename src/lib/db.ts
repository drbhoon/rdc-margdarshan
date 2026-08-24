import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const isProd = process.env.NODE_ENV === 'production';
const useSsl = connectionString.includes('sslmode=') || connectionString.includes('railway') || isProd;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
  dbInitialized: boolean | undefined;
};

export const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

const adapter = new PrismaPg(pool);
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

const STATEMENTS = [
  `DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('MENTEE', 'MENTOR', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'MATCHING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "PairStatus" AS ENUM ('PROPOSED', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `CREATE TABLE IF NOT EXISTS "Employee" (
    "employeeCode" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
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
    "mentorCapacity" INTEGER NOT NULL DEFAULT 1
  );`,
  `CREATE TABLE IF NOT EXISTS "Cohort" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CohortStatus" NOT NULL DEFAULT 'MATCHING'
  );`,
  `CREATE TABLE IF NOT EXISTS "MentoringPair" (
    "id" TEXT PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "menteeCode" TEXT NOT NULL,
    "mentorCode" TEXT NOT NULL,
    "status" "PairStatus" NOT NULL DEFAULT 'PROPOSED',
    "matchScore" DOUBLE PRECISION NOT NULL,
    "declineReason" TEXT,
    "sharedGoals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT PRIMARY KEY,
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
    "postSessionReflectionMentor" TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS "SharedNotebook" (
    "id" TEXT PRIMARY KEY,
    "pairId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "PrivateNote" (
    "id" TEXT PRIMARY KEY,
    "employeeCode" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "ActionItem" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING'
  );`,
  `CREATE TABLE IF NOT EXISTS "Resource" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadedBy" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "SurveyFeedback" (
    "id" TEXT PRIMARY KEY,
    "pairId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "growthRating" INTEGER NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "performedBy" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `INSERT INTO "Employee" ("employeeCode", "name", "email", "role", "department", "designation", "joinDate", "isConsentShared")
   VALUES ('EMP001', 'Puja Singh', 'puja.singh@rdc.in', 'ADMIN', 'HR, L&D & Operational Excellence', 'Head of L&D and Operational Excellence', CURRENT_TIMESTAMP, true)
   ON CONFLICT ("employeeCode") DO NOTHING;`
];

/**
 * Self-healing automatic schema bootstrap for PostgreSQL on Railway
 * Ensures all required tables, types and Admin exist.
 */
export async function ensureDatabaseSchema() {
  if (globalForPrisma.dbInitialized) return;

  try {
    for (const stmt of STATEMENTS) {
      await pool.query(stmt).catch((err) => {
        console.warn('[DB Bootstrap Statement Warning]:', err.message);
      });
    }
    globalForPrisma.dbInitialized = true;
    console.log('[DB] Self-healing PostgreSQL schema bootstrap completed successfully.');
  } catch (err) {
    console.error('[DB] Schema bootstrap error:', err);
  }
}

// Automatically trigger on import
ensureDatabaseSchema().catch(() => {});
