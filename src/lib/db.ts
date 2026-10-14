import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globals = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: pg.Pool;
};

export const pool =
  globals.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const prisma =
  globals.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });
globals.pool = pool;
globals.prisma = prisma;

let schemaEnsured = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        const columns = [
          'ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "highestQualification" TEXT;',
          'ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;',
          'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "mentorComments" TEXT;',
          'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "meetingNotes" TEXT;',
          'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "transcriptionNotes" TEXT;',
        ];

        for (const sql of columns) {
          try {
            await pool.query(sql);
          } catch (colErr) {
            console.warn("Schema alter column notice:", sql, colErr instanceof Error ? colErr.message : colErr);
          }
        }

        // Safe legacy week 0 migration
        try {
          await pool.query(`
            UPDATE "Session"
            SET "status" = CASE WHEN s0."status" = 'COMPLETED' THEN 'COMPLETED' ELSE "Session"."status" END,
                "preSessionNotes" = COALESCE("Session"."preSessionNotes", s0."preSessionNotes"),
                "discussionPoints" = COALESCE("Session"."discussionPoints", s0."discussionPoints"),
                "insights" = COALESCE("Session"."insights", s0."insights"),
                "commitments" = COALESCE("Session"."commitments", s0."commitments"),
                "supportNeeded" = COALESCE("Session"."supportNeeded", s0."supportNeeded"),
                "googleMeetLink" = COALESCE("Session"."googleMeetLink", s0."googleMeetLink"),
                "scheduledTime" = COALESCE("Session"."scheduledTime", s0."scheduledTime")
            FROM "Session" s0
            WHERE s0."pairId" = "Session"."pairId" AND s0."weekNumber" = 0 AND "Session"."weekNumber" = 1;

            UPDATE "Session" SET "weekNumber" = 1
            WHERE "weekNumber" = 0
            AND NOT EXISTS (
              SELECT 1 FROM "Session" s2 WHERE s2."pairId" = "Session"."pairId" AND s2."weekNumber" = 1
            );

            DELETE FROM "Session" WHERE "weekNumber" = 0;
          `);
        } catch (migErr) {
          console.warn("Session week migration notice:", migErr instanceof Error ? migErr.message : migErr);
        }

        schemaEnsured = true;
      } catch (err) {
        console.error("Schema reconciliation error:", err instanceof Error ? err.message : err);
      } finally {
        schemaPromise = null;
      }
    })();
  }
  await schemaPromise;
}
