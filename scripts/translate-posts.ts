/**
 * The Farsi translation pipeline CLI (PIPE-01): select approved English posts, translate
 * them, and write each result as a Farsi sibling DRAFT that a human publishes by hand.
 *
 * Dry run is the DEFAULT. There is no flag that turns it on. Writing requires --execute.
 *
 * Dry run, default selection (dev dataset):
 *   npx tsx --env-file .env.local scripts/translate-posts.ts
 * Dry run, whole backlog (dev dataset):
 *   npx tsx --env-file .env.local scripts/translate-posts.ts --all
 * Dry run against the production dataset, which reads and never writes:
 *   npx tsx --env-file .env.vercel-prod scripts/translate-posts.ts --all
 * Execute one post (dev dataset):
 *   npx tsx --env-file .env.local scripts/translate-posts.ts --slug <slug> --execute
 * Execute against the PRODUCTION dataset, only on Saeid's explicit in-session go (D-11):
 *   npx tsx --env-file .env.vercel-prod scripts/translate-posts.ts --all --execute
 *
 * Flags, all of them optional:
 *   --slug <value>     target exactly one post (D-09; the phase success gate uses this)
 *   --all              required before --execute will process more than one post
 *   --retranslate      the only way a stale or existing Farsi sibling enters the working set (D-08)
 *   --execute          the only way anything is written (D-14)
 *   --dry-run          an explicit alias for the default, accepted for readability, a no-op
 *   --resume <batch-id>  reattach to an already-created batch instead of re-spending tokens
 *
 * The resolved projectId, dataset, apiVersion and mode print as the FIRST line, before any
 * read and before any write. The two datasets here are `blog_posts` (production) and
 * `blog_posts_dev` (dev), they differ by one suffix, and the choice is made entirely by
 * which --env-file the operator passed. Without that read-back a wrong-dataset run prints a
 * confident success message about the wrong content lake (research Pitfall 2). A mutating
 * run against production prints a second, louder line on top of it.
 *
 * No credential, connection string or other environment value is ever printed here.
 */

import { createClient } from "@sanity/client";

const PRODUCTION_DATASET = "blog_posts";

// ── Flags ────────────────────────────────────────────────────────────────────
// process.argv plus includes/indexOf, no argument-parsing library, matching
// scripts/migrate-post-language.ts and scripts/checks/language-filter.check.ts.
const argv = process.argv.slice(2);

/** The value that follows `name`, or null when `name` was not passed. */
function flagValue(name: string): string | null {
  const at = argv.indexOf(name);
  if (at === -1) return null;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`${name} needs a value: ${name} <value>. Nothing was read and nothing was written.`);
    process.exit(1);
  }
  return value;
}

const slugArg = flagValue("--slug");
const resumeArg = flagValue("--resume");
const all = argv.includes("--all");
const retranslate = argv.includes("--retranslate");
const execute = argv.includes("--execute");
const dryRunAlias = argv.includes("--dry-run");

// D-14: --dry-run is an alias for a default that is already dry, so pairing it with
// --execute states two opposite intentions in one command. There is no defensible
// reading of that combination, so it is refused rather than silently resolved.
if (dryRunAlias && execute) {
  console.error(
    "--dry-run and --execute conflict: --dry-run is only an explicit alias for the default, which already writes nothing, and --execute is the one flag that writes. " +
      "Pass exactly one of them, or neither. Nothing was read and nothing was written.",
  );
  process.exit(1);
}

// ── Client ───────────────────────────────────────────────────────────────────
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
// No fallback dataset string on purpose. `production` is not a dataset in this
// project, and a silent default is exactly how a script writes to the wrong dataset.
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  // Raw, not the default published perspective. Farsi siblings exist only as drafts, and
  // the published perspective cannot see a `drafts.` document at all, so the sibling count
  // in the selection query would come back 0 for every post and the pipeline would happily
  // re-translate the entire backlog on every run. This one line is the whole ballgame.
  perspective: "raw",
});

let databaseWasOpened = false;

/**
 * The id of the ADMIN user that token spend will be booked against.
 *
 * Imported lazily and only from here, because src/lib/prisma.ts builds its Postgres adapter
 * at module load: a top-level import would make a Sanity-only dry run fail on an unreachable
 * database. Same lazy-import convention as scripts/checks/env-preflight.check.ts.
 */
async function resolveAdmin(): Promise<string> {
  const { resolveAdminUserId } = await import("./lib/token-usage");
  databaseWasOpened = true;
  return resolveAdminUserId();
}

/** Close the Postgres pool, but only if something actually opened it. */
async function releaseDatabase(): Promise<void> {
  if (!databaseWasOpened) return;
  const { prisma } = await import("../src/lib/prisma");
  await prisma.$disconnect();
}

async function run(): Promise<void> {
  // The header printed the env values. This asserts the client actually resolved the same
  // dataset, so the operator read-back can never drift from the content lake really being
  // talked to, which is the one thing the read-back exists to guarantee.
  const resolved = client.config().dataset;
  if (resolved !== dataset) {
    throw new Error(
      `the client resolved dataset "${resolved}" but the header announced "${dataset}". Refusing to continue: the read-back and the target disagree.`,
    );
  }

  // Resolved before anything is submitted and before a single token is spent.
  // TokenUsage.userId is a required foreign key with no session to take it from, so a run
  // that discovers a missing ADMIN afterwards has already lost the record of what it cost.
  let adminUserId: string | null = null;
  try {
    adminUserId = await resolveAdmin();
  } catch (err) {
    // Fatal for a run that will spend money. A dry run spends nothing, so it continues and
    // says so, which keeps the script usable against an environment whose database parity
    // the phase preflight artifact flagged as missing.
    if (execute) throw err;
    console.log(
      "WARNING: no ADMIN user could be resolved in this environment's database, so a real run could not record its token spend. Continuing because this is a dry run; --execute would abort here.",
    );
    console.log(`  ${err instanceof Error ? err.message : String(err)}`);
  }

  if (adminUserId !== null) {
    console.log("ADMIN user resolved: token spend can be recorded. The id itself is not printed.");
  }
}

async function main(): Promise<void> {
  // Operator read-back defence, printed before any read or write.
  console.log(
    `translate-posts: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} mode=${execute ? "EXECUTE" : "DRY RUN"}`,
  );
  if (execute && dataset === PRODUCTION_DATASET) {
    console.log("!! TARGET IS THE PRODUCTION DATASET !!");
  }
  console.log(
    `translate-posts: slug=${slugArg ?? "(none)"} all=${all} retranslate=${retranslate} resume=${resumeArg ?? "(none)"}`,
  );

  try {
    await run();
  } finally {
    await releaseDatabase();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
