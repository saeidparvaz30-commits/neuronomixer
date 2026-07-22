/**
 * One-time script: links an existing Sanity author document to a Prisma user.
 * Run with:  npx tsx --env-file .env.local scripts/link-sanity-author.ts
 */

import { createClient } from "@sanity/client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const TARGET_EMAIL = "saeidparvaz30@gmail.com";

// ── Sanity client ─────────────────────────────────────────────────────────────
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token:     process.env.SANITY_API_TOKEN,
  useCdn:    false,
});

// ── Prisma client ─────────────────────────────────────────────────────────────
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  // 1. List all Sanity authors
  const authors = await sanity.fetch<{ _id: string; name: string; email?: string; userId?: string; applicationStatus?: string }[]>(
    `*[_type == "author"] | order(name asc) { _id, name, email, userId, applicationStatus }`
  );

  console.log("\n── Sanity authors ──────────────────────────────────");
  authors.forEach((a) =>
    console.log(`  ${a._id}  |  ${a.name}  |  email: ${a.email ?? "—"}  |  userId: ${a.userId ?? "—"}`)
  );

  // 2. Find the best match (by email first, then name contains "saeid")
  const author =
    authors.find((a) => a.email === TARGET_EMAIL) ??
    authors.find((a) => a.name?.toLowerCase().includes("saeid"));

  if (!author) {
    console.error("\n✗ No matching Sanity author found. Update TARGET_EMAIL or check names above.");
    process.exit(1);
  }
  console.log(`\n✓ Matched Sanity author: "${author.name}" (_id: ${author._id})`);

  // 3. Find Prisma user
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.error(`\n✗ No Prisma user found for ${TARGET_EMAIL}`);
    process.exit(1);
  }
  console.log(`✓ Found Prisma user: ${user.name} (id: ${user.id})`);
  console.log(`  Current role: ${user.role} | sanityAuthorId: ${user.sanityAuthorId ?? "not set"}`);

  // 4. Update Prisma user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      sanityAuthorId: author._id,
      authorStatus:   "APPROVED",
    },
  });
  console.log(`\n✓ Prisma user updated — sanityAuthorId set to ${author._id}`);

  // 5. Update Sanity author (set userId + mark approved if not already)
  const patch: Record<string, unknown> = {};
  if (!author.userId) patch.userId = user.id;
  if (author.applicationStatus !== "approved") patch.applicationStatus = "approved";

  if (Object.keys(patch).length > 0) {
    await sanity.patch(author._id).set(patch).commit();
    console.log(`✓ Sanity author updated:`, patch);
  } else {
    console.log("✓ Sanity author already up to date.");
  }

  console.log("\n🎉 Done! Saeid's Sanity author is now linked to the admin account.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => process.exit(0));
