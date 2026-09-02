import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makePrisma(): PrismaClient {
  // FIX: Add the 30-second timeout here too so the server doesn't time out on Neon cold starts
  const pool = new Pool({ 
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 30000 
  });
  const adapter = new PrismaPg(pool);

  if (env.NODE_ENV === "development") {
    return new PrismaClient({ adapter, log: ["warn", "error"] });
  }
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;