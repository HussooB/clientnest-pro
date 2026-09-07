import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";

// ✅ Pool and adapter created ONCE at the module level.
const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 60000,
  // ✅ Fix for "self-signed certificate in certificate chain" with Supabase Pooler
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter, 
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] 
});

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}