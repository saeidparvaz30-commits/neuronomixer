/**
 * One-off migration: stamp `language: "en"` on every post document that lacks it.
 *
 * Dry run is the DEFAULT. There is no flag that turns it on. Mutation requires --execute.
 *
 * Dry run (dev dataset):
 *   npx tsx --env-file .env.local scripts/migrate-post-language.ts
 * Execute (dev dataset):
 *   npx tsx --env-file .env.local scripts/migrate-post-language.ts --execute
 * Execute (PRODUCTION dataset, only on Saeid's explicit in-session go, D-09):
 *   npx tsx --env-file .env.vercel-prod scripts/migrate-post-language.ts --execute
 *
 * The patch is `setIfMissing`, so it is additive and idempotent: a re-run is a no-op
 * and a value written by the Phase 3 translation pipeline is never clobbered.
 *
 * Every run prints the resolved projectId, dataset and mode BEFORE reading or writing
 * anything, because the two datasets here are `blog_posts` (production, ~26 posts) and
 * `blog_posts_dev` (dev, ~17 posts) and a wrong-dataset run would otherwise print a
 * confident success message (research Pitfall 6).
 */

import { createClient } from "@sanity/client";

const PRODUCTION_DATASET = "blog_posts";
const EN = "en";

const execute = process.argv.includes("--execute");

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
// No fallback dataset string on purpose. `production` is not a dataset in this
// project, and a silent default is exactly how a migration stamps the wrong one.
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  // Raw, not the default published perspective: a draft post must be stamped too.
  // Both datasets hold zero drafts today, but the script has to stay correct if
  // that changes before it runs.
  perspective: "raw",
});

type Row = { _id: string; title?: string; slug?: string };

async function main(): Promise<void> {
  // Operator read-back defence, printed before any read or write.
  console.log(
    `migrate-post-language: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} mode=${execute ? "EXECUTE" : "DRY RUN"}`,
  );
  if (execute && dataset === PRODUCTION_DATASET) {
    console.log("!! TARGET IS THE PRODUCTION DATASET !!");
  }

  const rows = await client.fetch<Row[]>(
    `*[_type == "post" && !defined(language)] | order(_createdAt asc){ _id, title, "slug": slug.current }`,
  );

  console.log(`${rows.length} post document(s) in ${dataset} with no language field:`);
  for (const row of rows) {
    console.log(`  ${row._id}  ${row.slug ?? "(no slug)"}  ${row.title ?? "(no title)"}`);
  }

  if (rows.length === 0) {
    console.log(`Nothing to do: every post in ${dataset} already carries a language field.`);
    return;
  }

  if (!execute) {
    // Exactly one server-validated commit that persists nothing. This is also the
    // probe that proves the token carries write scope BEFORE any loop starts
    // making partial writes (research assumption A1).
    await client
      .patch(rows[0]!._id)
      .setIfMissing({ language: EN })
      .commit({ dryRun: true });
    console.log("DRY RUN: mutation validated server-side, nothing written.");
    console.log(`Re-run with --execute to apply: npx tsx --env-file <env> scripts/migrate-post-language.ts --execute`);
    return;
  }

  // One transaction, one commit: atomic per commit at these document counts.
  let tx = client.transaction();
  for (const row of rows) {
    tx = tx.patch(row._id, (p) => p.setIfMissing({ language: EN }));
  }
  await tx.commit();
  console.log(`EXECUTE: stamped ${rows.length} post document(s) with language "${EN}" in ${dataset}.`);

  const remaining = await client.fetch<number>(`count(*[_type == "post" && !defined(language)])`);
  console.log(`Remaining without a language field in ${dataset}: ${remaining}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
