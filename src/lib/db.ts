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
/** Compatibility for existing callers: no database mutations. */
export async function ensureDatabaseSchema() {}
