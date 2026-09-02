import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../src/utils/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SeedUser = {
  email: string;
  password: string;
  role: Role;
  name: string;
};

const seedUsers: SeedUser[] = [
  {
    email: "admin@clientnest.com",
    password: "Admin123!",
    role: Role.Admin,
    name: "System Admin",
  },
  {
    email: "finance@clientnest.com",
    password: "Finance123!",
    role: Role.Finance,
    name: "Finance User",
  },
  {
    email: "support@clientnest.com",
    password: "Support123!",
    role: Role.Support,
    name: "Support User",
  },
  {
    email: "sales@clientnest.com",
    password: "Sales123!",
    role: Role.Sales,
    name: "Sales User",
  },
];

async function main(): Promise<void> {
  console.log("🌱 Seeding ClientNest Pro database...");

  const results: { email: string; role: Role; status: string }[] = [];

  for (const user of seedUsers) {
    const passwordHash = await hashPassword(user.password);

    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true,
      },
    });

    results.push({
      email: upserted.email,
      role: upserted.role,
      status: "upserted",
    });
  }

  console.log("\n✅ Seed complete! Summary:");
  console.log("--------------------------------------------------");
  for (const r of results) {
    console.log(`  • ${r.email.padEnd(30)} [${r.role.padStart(8)}] → ${r.status}`);
  }
  console.log("--------------------------------------------------");
  console.log(`Total users: ${results.length}`);
}

main()
  .catch((e: unknown) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
