import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";

// ✅ 1. Pool and adapter created ONCE at the module level. 
// No functions, no re-creation.
const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 60000 // 60 seconds to guarantee Neon wake-up
});

const adapter = new PrismaPg(pool);

// ✅ 2. True Singleton pattern
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