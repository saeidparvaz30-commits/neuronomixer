/**
 * Environment preflight for the Phase 3 translation pipeline.
 *
 * LIVE ONLY. There is no offline section. This check needs an --env-file and it opens a
 * Postgres connection, so it can never be run bare the way language-filter.check.ts can.
 *
 * Dev target (dev Sanity dataset + dev Postgres):
 *   npx tsx --env-file .env.local scripts/checks/env-preflight.check.ts
 * Production target (prod Sanity dataset + whatever DATABASE_URL that file carries):
 *   npx tsx --env-file .env.vercel-prod scripts/checks/env-preflight.check.ts
 *
 * It answers the three questions RESEARCH left open (assumptions A2, A3, A4): is there an
 * ANTHROPIC_API_KEY anywhere, does the production env file carry a DATABASE_URL, and does
 * the target database have the TokenUsage table plus at least one ADMIN user. All three
 * must be settled before a paid Batch API run, because each one fails AFTER the money is
 * spent rather than before.
 *
 * Secret discipline: every credential is reported as a presence boolean and never as a
 * value. The single environment value printed verbatim is NEXT_PUBLIC_SANITY_DATASET,
 * because the dataset name is the operator read-back defence against a wrong-dataset run
 * (research Pitfall 6) and is not a secret. Nothing else is printed, ever, and the same
 * rule governs the artifact this check feeds.
 *
 * Postgres reads only. It runs a findFirst and a count; it writes nothing.
 */

import assert from "node:assert";

/** Credentials reported as presence booleans. The value is never read into a variable. */
const PRESENCE_KEYS: readonly string[] = [
  "ANTHROPIC_API_KEY",
  "SANITY_API_TOKEN",
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "DATABASE_URL",
];

/**
 * Three states, not two. FAIL means the plumbing this phase already built is broken here
 * and the exit code says so. BLOCKER means a later plan cannot run until someone adds
 * something, which is a fact to record rather than a reason to redden a check of the
 * plumbing. Collapsing the two would either hide a real break or make this check
 * permanently red for a reason no code change can fix.
 */
type Status = "PASS" | "FAIL" | "BLOCKER";

/** Needed only by the paid Batch API run in plan 03-05, so absence is a BLOCKER not a FAIL. */
const DEFERRED_KEYS: Readonly<Record<string, string>> = {
  ANTHROPIC_API_KEY:
    "required by the Batch API run in plan 03-05. Add it to .env.local (dev rehearsal) and .env.vercel-prod (proof run) before 03-05 starts. It is in none of .env, .env.local or .env.vercel-prod today.",
};

type Row = { name: string; status: Status; detail: string };

const rows: Row[] = [];

function record(name: string, status: Status, detail: string): void {
  rows.push({ name, status, detail });
}

/** Defined AND non-empty. An env file with `KEY=` present but blank is not a key. */
function isPresent(key: string): boolean {
  const raw = process.env[key];
  return typeof raw === "string" && raw.length > 0;
}

async function main(): Promise<void> {
  // No fallback on either of these on purpose. A silent default is how a preflight ends
  // up confidently green about a dataset the pipeline will never touch.
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

  // The two hard requirements: without these, nothing downstream in the phase can run,
  // so they abort rather than becoming a FAIL row.
  assert.ok(
    dataset,
    "NEXT_PUBLIC_SANITY_DATASET is required and has no default. Re-run with --env-file .env.local or --env-file .env.vercel-prod.",
  );
  assert.ok(
    projectId,
    "NEXT_PUBLIC_SANITY_PROJECT_ID is required and has no default. Re-run with --env-file .env.local or --env-file .env.vercel-prod.",
  );

  // Operator read-back defence, printed before any probe. dataset is the only env value
  // this script ever prints.
  console.log(`env-preflight: dataset=${dataset}`);

  for (const key of PRESENCE_KEYS) {
    if (isPresent(key)) {
      record(key, "PASS", "defined and non-empty");
    } else if (key in DEFERRED_KEYS) {
      record(key, "BLOCKER", `MISSING from this env file. ${DEFERRED_KEYS[key]}`);
    } else {
      record(key, "FAIL", "MISSING from this env file");
    }
  }

  if (!isPresent("DATABASE_URL")) {
    // Skipped, not passed. A skipped probe that reported PASS would be the exact silent
    // green this whole check exists to prevent.
    record(
      "TokenUsage table",
      "FAIL",
      "SKIPPED: no DATABASE_URL in this env file, so the database was never contacted",
    );
    record(
      "ADMIN user",
      "FAIL",
      "SKIPPED: no DATABASE_URL in this env file, so the database was never contacted",
    );
  } else {
    // Imported lazily and only past this branch: src/lib/prisma.ts constructs its adapter
    // at module evaluation time from DATABASE_URL, so a top-level import would blow up on
    // an env file that has none, before this check could report anything at all.
    const { resolveAdminUserId } = await import("../lib/token-usage");
    const { prisma } = await import("../../src/lib/prisma");

    // Each probe is caught separately so one missing piece still yields a complete report
    // rather than a stack trace and four unanswered rows.
    try {
      const count = await prisma.tokenUsage.count();
      record("TokenUsage table", "PASS", `present, ${count} row(s)`);
    } catch (err) {
      record(
        "TokenUsage table",
        "FAIL",
        `query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      const adminId = await resolveAdminUserId();
      // The id itself is a cuid, not a credential, but there is no reason to print it.
      record("ADMIN user", "PASS", `resolved (id length ${adminId.length})`);
    } catch (err) {
      record(
        "ADMIN user",
        "FAIL",
        `not resolved: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    await prisma.$disconnect();
  }

  for (const row of rows) {
    console.log(`  ${row.status.padEnd(7)} ${row.name}: ${row.detail}`);
  }

  const passed = rows.filter((r) => r.status === "PASS").length;
  const failed = rows.filter((r) => r.status === "FAIL").length;
  const blockers = rows.filter((r) => r.status === "BLOCKER").length;
  console.log(
    `env-preflight: dataset=${dataset} ${passed}/${rows.length} passed, ${failed} failed, ${blockers} blocker(s)`,
  );

  if (failed > 0) {
    process.exit(1);
  }

  if (blockers > 0) {
    console.log(
      `env-preflight.check.ts: PASS WITH ${blockers} BLOCKER(S). The plumbing is sound; see the BLOCKER row(s) above for what must be added before the plan named there can run.`,
    );
    return;
  }

  console.log("env-preflight.check.ts: ALL PASS");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
