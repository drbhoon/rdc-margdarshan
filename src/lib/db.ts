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
    `);
    schemaEnsured = true;
  } catch (err) {
    console.warn("Schema reconciliation notice:", err instanceof Error ? err.message : err);
  }
}

