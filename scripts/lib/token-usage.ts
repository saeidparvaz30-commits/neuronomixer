/**
 * TokenUsage recording for CLI scripts.
 *
 * Why this file exists: no in-repo CLI has ever written `TokenUsage`. Both existing
 * writers (src/app/api/cv/extract/route.ts and src/app/api/cv/design/route.ts) take
 * `userId` from an authenticated session, and a script has none. `TokenUsage.userId`
 * is a required foreign key to `User`, so a script that guesses an id inserts nothing
 * and fails on the constraint.
 *
 * The trap being avoided: discovering that required foreign key AFTER a paid Batch API
 * run has already completed. Callers must invoke `resolveAdminUserId()` at the top of a
 * run, before the first token is spent, so a missing ADMIN aborts the run instead of
 * losing the spend record once the money is gone.
 *
 * Both functions are awaited and neither swallows an error. In a route handler a
 * fire-and-forget spend log costs a log line; in a CLI that exits immediately after,
 * it silently loses the record.
 *
 * Neither function logs a connection string, a token, or any environment value.
 * The Postgres target is chosen entirely by which --env-file the caller passed:
 * src/lib/prisma.ts reads DATABASE_URL at construction time.
 */
import { prisma } from "../../src/lib/prisma";

/** One model call's spend. `totalTokens` is derived, never supplied by the caller. */
export type TokenUsageRow = {
  activity: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * The id of the oldest ADMIN user in the database the caller's env file points at.
 *
 * Throws rather than returning null: the caller is about to spend money, and a
 * silent skip here is how a run completes with no record of what it cost.
 */
export async function resolveAdminUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!admin) {
    throw new Error(
      "No user with role ADMIN exists in this database, so token spend cannot be recorded. " +
        "TokenUsage.userId is a required foreign key to User and a CLI has no session to take it from. " +
        "Create an ADMIN user in the target database, or re-run against an env file whose DATABASE_URL has one, " +
        "before starting a run that spends tokens.",
    );
  }

  return admin.id;
}

/**
 * Write one TokenUsage row per model call and return the number of rows written.
 *
 * An empty array short-circuits to 0: a run that made no model calls is a legitimate
 * outcome (a dry run, or a select query that matched nothing) and must not throw.
 */
export async function recordTokenUsage(
  userId: string,
  rows: readonly TokenUsageRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const result = await prisma.tokenUsage.createMany({
    data: rows.map((r) => ({
      userId,
      activity: r.activity,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      totalTokens: r.inputTokens + r.outputTokens,
    })),
  });

  return result.count;
}
