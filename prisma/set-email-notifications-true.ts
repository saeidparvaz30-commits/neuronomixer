/**
 * One-time script: enable email notifications for all existing users.
 *
 * Run once with:
 *   npx tsx prisma/set-email-notifications-true.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: { emailNotifications: false },
    data: { emailNotifications: true },
  });

  console.log(`✓ Enabled email notifications for ${result.count} existing user(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
