/**
 * One-time migration: set status = "approved" on all posts that have no status.
 * Run with: node scripts/migrate-post-status.mjs
 */

import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const posts = await client.fetch(
  `*[_type == "post" && !defined(status)]{ _id, title }`
);

if (posts.length === 0) {
  console.log("No posts need updating.");
  process.exit(0);
}

console.log(`Found ${posts.length} posts without status. Setting to "approved"...`);

for (const post of posts) {
  await client.patch(post._id).set({ status: "approved" }).commit();
  console.log(`  ✓ ${post.title}`);
}

console.log("Done.");
