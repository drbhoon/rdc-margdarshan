import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
const globals = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: pg.Pool;
};
// Schema changes belong to reviewed migrations, never module imports or HTTP reads.
export const pool =
  globals.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const prisma =
  globals.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });
globals.pool = pool;
globals.prisma = prisma;
let schemaEnsured = false;
export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;
  try {
    await pool.query(`
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "highestQualification" TEXT;
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;
      ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "mentorComments" TEXT;
      ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "meetingNotes" TEXT;
      ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "transcriptionNotes" TEXT;
    `);

    // Safely migrate legacy week 0 sessions to week 1 if any exist
    try {
      await pool.query(`
        UPDATE "Session" s1
        SET "preSessionNotes" = COALESCE(s1."preSessionNotes", s0."preSessionNotes"),
            "discussionPoints" = COALESCE(s1."discussionPoints", s0."discussionPoints"),
            "insights" = COALESCE(s1."insights", s0."insights"),
            "commitments" = COALESCE(s1."commitments", s0."commitments"),
            "supportNeeded" = COALESCE(s1."supportNeeded", s0."supportNeeded"),
            "googleMeetLink" = COALESCE(s1."googleMeetLink", s0."googleMeetLink"),
            "scheduledTime" = COALESCE(s1."scheduledTime", s0."scheduledTime"),
            "status" = CASE WHEN s0."status" = 'COMPLETED' THEN 'COMPLETED' ELSE s1."status" END
        FROM "Session" s0
        WHERE s0."pairId" = s1."pairId" AND s0."weekNumber" = 0 AND s1."weekNumber" = 1;
        DELETE FROM "Session" WHERE "weekNumber" = 0;
      `);
    } catch {
      // Ignore if session migration was already performed or table structure differs
    }

    schemaEnsured = true;
  } catch (err) {
    console.warn("Schema reconciliation notice:", err instanceof Error ? err.message : err);
  }
}

