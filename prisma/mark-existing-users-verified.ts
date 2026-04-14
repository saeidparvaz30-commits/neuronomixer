/**
 * One-time script: mark all existing password-based accounts as email-verified
 * so they aren't locked out after the email-verification feature was added.
 *
 * Run once with:
 *   npx tsx prisma/mark-existing-users-verified.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      password: { not: null },
      emailVerified: null,
    },
    data: { emailVerified: new Date() },
  });

  console.log(`✓ Marked ${result.count} existing user(s) as email-verified.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
