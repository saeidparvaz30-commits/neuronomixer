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
 * It answers the questions RESEARCH left open (assumptions A3 and A4) plus the transport
 * question D-16 replaced them with: does the production env file carry a DATABASE_URL, does
 * the target database have the TokenUsage table plus at least one ADMIN user, and can the
 * `claude` CLI be spawned at all. Each one otherwise fails AFTER a run has started rather
 * than before it.
 *
 * D-16 (Saeid, 2026-08-23): every model call in this phase rides the Claude Code CLI on his
 * subscription, so there is no Anthropic API key in any env file and the BLOCKER row that
 * used to demand one is void. Its replacement is a `claude --version` probe, and that probe
 * is a FAIL rather than a BLOCKER on purpose: the CLI is already installed and authenticated
 * on this machine, so a machine where it cannot be spawned has broken plumbing, not a pending
 * human action. This file names no API-key environment variable anywhere, deliberately.
 *
 * Secret discipline: every credential is reported as a presence boolean and never as a
 * value. The single environment value printed verbatim is NEXT_PUBLIC_SANITY_DATASET,
 * because the dataset name is the operator read-back defence against a wrong-dataset run
 * (research Pitfall 6) and is not a secret. Nothing else is printed, ever, and the same
 * rule governs the artifact this check feeds.
 *
 * Postgres reads only. It runs a findFirst and a count; it writes nothing.
 */

import { spawnSync } from "node:child_process";

/** Credentials reported as presence booleans. The value is never read into a variable. */
const PRESENCE_KEYS: readonly string[] = [
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

/**
 * Keys whose absence gates a LATER plan on a human action rather than breaking this phase's
 * plumbing. Deliberately empty since D-16 voided the only entry it ever had; the mechanism
 * stays because the next such gap should be recordable without re-inventing the third state.
 */
const DEFERRED_KEYS: Readonly<Record<string, string>> = {};

type Row = { name: string; status: Status; detail: string };

/**
 * Can the Claude Code CLI be spawned? This is the D-16 transport for every model call in the
 * phase, so an unspawnable `claude` is exactly as fatal as a missing SANITY_API_TOKEN.
 *
 * Two attempts on purpose. The install on this machine is a bare `claude.exe` on PATH, which
 * Windows CreateProcess resolves without a shell, but a npm-style install ships a `claude.cmd`
 * shim that only a shell can resolve. Trying direct first and falling back to `shell: true`
 * handles both shapes instead of assuming one. The version string is printed because a probe
 * that reports only "yes" cannot tell a later reader which build answered.
 */
function probeClaudeCli(): { ok: boolean; detail: string } {
  let lastError = "";

  for (const useShell of [false, true]) {
    const result = spawnSync("claude", ["--version"], {
      encoding: "utf8",
      shell: useShell,
      windowsHide: true,
    });

    if (result.error) {
      lastError = result.error.message;
      continue;
    }

    const how = useShell ? " (via shell)" : "";
    if (result.status === 0) {
      const version = (result.stdout ?? "").trim().split("\n")[0] ?? "(no version line)";
      return { ok: true, detail: `spawnable${how}, ${version}` };
    }

    return {
      ok: false,
      detail: `\`claude --version\`${how} exited ${result.status ?? "with a signal"}`,
    };
  }

  return {
    ok: false,
    detail: `\`claude\` could not be spawned directly or through a shell. Every model call in this phase rides the CLI on Saeid's subscription (D-16), so nothing downstream can run. Last spawn error: ${lastError}`,
  };
}

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
  // The transport probe goes first because it is the one row that needs no env file at all.
  // Running it before the env gate means `npx tsx scripts/checks/env-preflight.check.ts` with
  // no --env-file still answers "can this machine reach the model", which is the question
  // D-16 made the most important one in the phase.
  const cli = probeClaudeCli();
  record("claude CLI", cli.ok ? "PASS" : "FAIL", cli.detail);

  // No fallback on either of these on purpose. A silent default is how a preflight ends
  // up confidently green about a dataset the pipeline will never touch.
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const haveEnvFile = Boolean(dataset) && Boolean(projectId);

  // Operator read-back defence, printed before any env-dependent probe. dataset is the only
  // env value this script ever prints.
  console.log(
    haveEnvFile
      ? `env-preflight: dataset=${dataset}`
      : "env-preflight: no --env-file passed, so only the transport probe ran",
  );

  if (!haveEnvFile) {
    // A FAIL row rather than an assertion throw, so the transport row above still reaches the
    // report. The exit code is unchanged: a FAIL row exits 1, exactly as the abort used to.
    record(
      "env file",
      "FAIL",
      "NEXT_PUBLIC_SANITY_DATASET and NEXT_PUBLIC_SANITY_PROJECT_ID are required and have no defaults. Re-run with --env-file .env.local or --env-file .env.vercel-prod. Every row below the transport probe was skipped.",
    );
  } else {
    for (const key of PRESENCE_KEYS) {
      if (isPresent(key)) {
        record(key, "PASS", "defined and non-empty");
      } else if (key in DEFERRED_KEYS) {
        record(key, "BLOCKER", `MISSING from this env file. ${DEFERRED_KEYS[key]}`);
      } else {
        record(key, "FAIL", "MISSING from this env file");
      }
    }
  }

  if (haveEnvFile && !isPresent("DATABASE_URL")) {
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
  } else if (haveEnvFile) {
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
    `env-preflight: dataset=${dataset ?? "(none)"} ${passed}/${rows.length} passed, ${failed} failed, ${blockers} blocker(s)`,
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
