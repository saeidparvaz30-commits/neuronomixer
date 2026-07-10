/** Read-only post-seed verification. Run: npx tsx prisma/verify-seed-state.ts */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const cats = await prisma.guideCategory.findMany({
    orderBy: { order: "asc" },
    select: {
      slug: true,
      visibility: true,
      units: { select: { slug: true, visibility: true }, orderBy: { order: "asc" } },
      guides: { select: { implemented: true, visibility: true } },
    },
  });
  for (const c of cats) {
    const built = c.guides.filter((g) => g.implemented).length;
    const pub = c.guides.filter((g) => g.visibility === "PUBLISHED").length;
    console.log(
      `${c.slug} [${c.visibility}]: ${built} built / ${pub} published / ${c.guides.length} total, units: ${c.units.length}`
    );
    if (c.slug === "data-and-analysis") {
      console.log("  units:", c.units.map((u) => `${u.slug}[${u.visibility}]`).join(", "));
    }
  }
  const dda = await prisma.visualGuide.findUnique({
    where: { slug: "data-distributions-applied" },
    select: { implemented: true, visibility: true, unit: { select: { slug: true } } },
  });
  console.log("data-distributions-applied:", JSON.stringify(dda));
  const total = await prisma.visualGuide.count();
  console.log("total guides:", total);
}

main().finally(async () => prisma.$disconnect());
