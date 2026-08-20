/**
 * Logic + fidelity checks for the English-language filter in src/sanity/lib/queries.ts (CONTENT-02).
 * Run: npx tsx scripts/checks/language-filter.check.ts | live: npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --live | post-migration: npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --post-migration
 * The offline section needs no env and no network. Only --live / --post-migration touch the Content Lake, read-only.
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  EN_LANGUAGE,
  STATUS_TOLERANT,
  STATUS_STRICT,
  STATUS_APPROVED,
  blogIndexQuery,
  homePageQuery,
  postBySlugQuery,
  postStaticParamsQuery,
  postMetadataBySlugQuery,
  postsByAuthorSlugQuery,
  sitemapQuery,
  postsByAuthorIdQuery,
  authorReviewPostsQuery,
} from "../../src/sanity/lib/queries";

const QUERIES_PATH = "src/sanity/lib/queries.ts";
const REF_PATH = ".planning/phases/02-content-model/artifacts/pre-extraction-ref.txt";

/** The nine exported post queries, in declaration order. */
const QUERIES: ReadonlyArray<readonly [string, string]> = [
  ["blogIndexQuery", blogIndexQuery],
  ["homePageQuery", homePageQuery],
  ["postBySlugQuery", postBySlugQuery],
  ["postStaticParamsQuery", postStaticParamsQuery],
  ["postMetadataBySlugQuery", postMetadataBySlugQuery],
  ["postsByAuthorSlugQuery", postsByAuthorSlugQuery],
  ["sitemapQuery", sitemapQuery],
  ["postsByAuthorIdQuery", postsByAuthorIdQuery],
  ["authorReviewPostsQuery", authorReviewPostsQuery],
];

/** The seven public English call sites repointed by plan 02-01. */
const CALL_SITES: readonly string[] = [
  "src/app/(en)/blog/page.tsx",
  "src/app/(en)/page.tsx",
  "src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx",
  "src/app/(en)/authors/[slug]/page.tsx",
  "src/app/sitemap.ts",
  "src/app/api/v1/posts/route.ts",
  "src/app/(en)/review/page.tsx",
];

/** Where each query lived before plan 02-01 relocated it. Feeds assertion E. */
const ORIGINS: Readonly<Record<string, string>> = {
  blogIndexQuery: "src/app/(en)/blog/page.tsx",
  homePageQuery: "src/app/(en)/page.tsx",
  postBySlugQuery: "src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx",
  postStaticParamsQuery: "src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx",
  postMetadataBySlugQuery: "src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx",
  postsByAuthorSlugQuery: "src/app/(en)/authors/[slug]/page.tsx",
  sitemapQuery: "src/app/sitemap.ts",
  postsByAuthorIdQuery: "src/app/api/v1/posts/route.ts",
  authorReviewPostsQuery: "src/app/(en)/review/page.tsx",
};

/**
 * Collapse every whitespace run to a single space and trim. This repo checks out
 * with CRLF on Windows while `git show` returns LF, so normalising is what makes
 * a working-copy string comparable to its blob at a ref (plan 02-01 handoff).
 */
function normalise(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function countOf(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/** Walk src/ for .ts and .tsx files. */
function walkSrc(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

// ── A. Fragment identity ──────────────────────────────────────────────────────
// The literal is intentionally duplicated here. A test that imports the value it
// is testing proves nothing about that value.
const D03_PREDICATE = '(!defined(language) || language == "en")';
assert.strictEqual(
  EN_LANGUAGE,
  D03_PREDICATE,
  `EN_LANGUAGE drifted from the D-03 predicate.\n  expected: ${D03_PREDICATE}\n  actual:   ${EN_LANGUAGE}`,
);

// ── B. Per-query interpolation counts, on the resolved strings ────────────────
const EXPECTED_EN_COUNTS: Readonly<Record<string, number>> = {
  blogIndexQuery: 1,
  homePageQuery: 4,
  postBySlugQuery: 1,
  postStaticParamsQuery: 1,
  postMetadataBySlugQuery: 1,
  postsByAuthorSlugQuery: 1,
  sitemapQuery: 1,
  postsByAuthorIdQuery: 1,
  authorReviewPostsQuery: 1,
};

let totalEn = 0;
for (const [name, text] of QUERIES) {
  const expected = EXPECTED_EN_COUNTS[name]!;
  const actual = countOf(text, EN_LANGUAGE);
  assert.strictEqual(
    actual,
    expected,
    `${name} carries the language predicate ${actual} time(s), expected ${expected}`,
  );
  totalEn += actual;
}
assert.strictEqual(totalEn, 12, `total language-predicate occurrences ${totalEn}, expected 12`);

// ── C. Status-predicate preservation (anti-normalisation guard) ───────────────
const EXPECTED_STATUS_EQ_COUNTS: Readonly<Record<string, number>> = {
  blogIndexQuery: 2,
  homePageQuery: 8,
  postBySlugQuery: 1,
  postStaticParamsQuery: 1,
  postMetadataBySlugQuery: 0,
  postsByAuthorSlugQuery: 2,
  sitemapQuery: 0,
  postsByAuthorIdQuery: 0,
  authorReviewPostsQuery: 0,
};

// The approved-only predicate is a substring of the other two, so presence alone
// is ambiguous. The `status ==` occurrence counts above are what disambiguate.
const EXPECTED_STATUS_VARIANT: Readonly<Record<string, string | null>> = {
  blogIndexQuery: STATUS_TOLERANT,
  homePageQuery: STATUS_STRICT,
  postBySlugQuery: STATUS_APPROVED,
  postStaticParamsQuery: STATUS_APPROVED,
  postMetadataBySlugQuery: null,
  postsByAuthorSlugQuery: STATUS_TOLERANT,
  sitemapQuery: null,
  postsByAuthorIdQuery: null,
  authorReviewPostsQuery: null,
};

for (const [name, text] of QUERIES) {
  const expectedEq = EXPECTED_STATUS_EQ_COUNTS[name]!;
  const actualEq = countOf(text, 'status ==');
  assert.strictEqual(
    actualEq,
    expectedEq,
    `${name} contains ${actualEq} status-equality clause(s), expected ${expectedEq}. A status predicate was altered or normalised.`,
  );
  const variant = EXPECTED_STATUS_VARIANT[name];
  if (variant === null) {
    for (const [label, candidate] of [
      ["tolerant", STATUS_TOLERANT],
      ["strict", STATUS_STRICT],
      ["approved", STATUS_APPROVED],
    ] as const) {
      assert.ok(
        !text.includes(candidate),
        `${name} must carry no status predicate, but the ${label} variant is present`,
      );
    }
  } else {
    assert.ok(
      text.includes(variant),
      `${name} lost its expected status predicate.\n  expected to contain: ${variant}`,
    );
  }
}

// ── D. Interpolation allowlist (GROQ injection guard, threat T-02-01) ─────────
const ALLOWED_INTERPOLATIONS: readonly string[] = [
  "EN_LANGUAGE",
  "STATUS_TOLERANT",
  "STATUS_STRICT",
  "STATUS_APPROVED",
];
const querySource = fs.readFileSync(QUERIES_PATH, "utf8");
const interpolations = [...querySource.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]!.trim());
for (const expr of interpolations) {
  assert.ok(
    ALLOWED_INTERPOLATIONS.includes(expr),
    `${QUERIES_PATH} interpolates "${expr}" into GROQ. Only ${ALLOWED_INTERPOLATIONS.join(", ")} are allowed; every runtime value must stay a $param.`,
  );
}
assert.ok(interpolations.length > 0, `${QUERIES_PATH} contains no interpolations at all, which cannot be right`);

// ── E. Git fidelity against the recorded pre-extraction ref ───────────────────
const preExtractionRef = fs.readFileSync(REF_PATH, "utf8").trim();
assert.match(
  preExtractionRef,
  /^[0-9a-f]{40}$/,
  `${REF_PATH} must hold a 40-character lowercase hex SHA, got "${preExtractionRef}"`,
);

const NORMALISED_FRAGMENT = `${normalise(EN_LANGUAGE)} && `;
const originCache = new Map<string, string>();

function originAtRef(originPath: string): string {
  const cached = originCache.get(originPath);
  if (cached !== undefined) return cached;
  // Array args, never a shell string: four origin paths contain parentheses and
  // square brackets that a shell would mangle.
  const blob = execFileSync("git", ["show", `${preExtractionRef}:${originPath}`], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const normalised = normalise(blob);
  originCache.set(originPath, normalised);
  return normalised;
}

for (const [name, text] of QUERIES) {
  // Normalise BEFORE removing the fragment, so the multi-line sitemap formatting
  // and the one-line formatting elsewhere reduce to the same shape.
  const reconstructed = normalise(text).split(NORMALISED_FRAGMENT).join("");
  const originPath = ORIGINS[name]!;
  assert.ok(
    originAtRef(originPath).includes(reconstructed),
    `${name} is no longer textually faithful to ${originPath} at ${preExtractionRef}.\n  reconstructed: ${reconstructed}`,
  );
}

// ── F. No inline post GROQ left at the call sites ─────────────────────────────
const POST_TYPE_PREDICATE = '_type == "post"';
for (const callSite of CALL_SITES) {
  const source = fs.readFileSync(callSite, "utf8");
  assert.ok(
    !source.includes(POST_TYPE_PREDICATE),
    `${callSite} contains inline post GROQ. All public post queries must come from ${QUERIES_PATH}.`,
  );
}

// ── G. Server-only module boundary (research Pattern 2, threat T-02-07) ───────
const srcFiles = walkSrc("src");
const USE_CLIENT = /^\s*["']use client["']/m;
for (const file of srcFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (!USE_CLIENT.test(source)) continue;
  assert.ok(
    !/from\s+["'](?:@\/sanity\/lib\/queries|[^"']*\.{1,2}\/[^"']*sanity\/lib\/queries)["']/.test(source),
    `${file} is a client component and imports the query module. The language predicate would ship to the browser.`,
  );
}

// ── H. Single source of truth for the language-equality text ─────────────────
// Plan 02-05 adds a second, deliberate occurrence in src/sanity/structure.ts for
// Studio chrome. When it lands, extend ALLOWED_LANGUAGE_TEXT_FILES to two entries.
const ALLOWED_LANGUAGE_TEXT_FILES: readonly string[] = [QUERIES_PATH];
const LANGUAGE_EQUALITY_TEXT = "language ==";
const carriers = srcFiles
  .filter((f) => fs.readFileSync(f, "utf8").includes(LANGUAGE_EQUALITY_TEXT))
  .map((f) => f.split(path.sep).join("/"))
  .sort();
assert.deepStrictEqual(
  carriers,
  [...ALLOWED_LANGUAGE_TEXT_FILES].sort(),
  `the language predicate must be expressed in exactly one place under src/ (CONTENT-02).\n  found: ${carriers.join(", ")}`,
);

console.log(
  `offline: fragment identity OK, ${totalEn} interpolations across ${QUERIES.length} queries, status predicates intact, ${interpolations.length} interpolations all allowlisted, 9/9 faithful to ${preExtractionRef.slice(0, 7)}, ${CALL_SITES.length} call sites free of inline GROQ, ${srcFiles.length} src files scanned, sole carrier ${carriers.join(", ")}`,
);

const argv = process.argv.slice(2);
const wantsLive = argv.includes("--live") || argv.includes("--post-migration");
const wantsPostMigration = argv.includes("--post-migration");

if (!wantsLive) {
  console.log("language-filter.check.ts: ALL PASS");
}

// ── Live section: read-only, runs only under --live / --post-migration ────────

/**
 * Remove the language clause from a raw query, reconstructing the pre-filter text.
 * Same rule as assertion E, made whitespace-tolerant so the multi-line sitemap
 * formatting is handled without normalising the query the app actually runs.
 */
function stripLanguageClause(raw: string): string {
  const escaped = EN_LANGUAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return raw.replace(new RegExp(`${escaped}\\s*&&\\s*`, "g"), "");
}

/** Rows a query returned, so a silently emptied listing is visible, not merely asserted. */
const ROW_COUNTERS: Readonly<Record<string, (r: unknown) => number>> = {
  blogIndexQuery: (r) => branchLength(r, "posts"),
  homePageQuery: (r) => branchLength(r, "heroPosts") + branchLength(r, "latestPosts"),
  postBySlugQuery: (r) => (r ? 1 : 0),
  postStaticParamsQuery: (r) => (Array.isArray(r) ? r.length : 0),
  postMetadataBySlugQuery: (r) => (r ? 1 : 0),
  postsByAuthorSlugQuery: (r) => (Array.isArray(r) ? r.length : 0),
  sitemapQuery: (r) => branchLength(r, "posts"),
  postsByAuthorIdQuery: (r) => (Array.isArray(r) ? r.length : 0),
  authorReviewPostsQuery: (r) => (Array.isArray(r) ? r.length : 0),
};

/** Listing queries that must return at least one row for the parity run to mean anything. */
const MUST_BE_NON_EMPTY: readonly string[] = [
  "blogIndexQuery",
  "homePageQuery",
  "postsByAuthorSlugQuery",
  "sitemapQuery",
  "postsByAuthorIdQuery",
  "authorReviewPostsQuery",
];

function branchLength(result: unknown, branch: string): number {
  if (result === null || typeof result !== "object") return 0;
  const value = (result as Record<string, unknown>)[branch];
  return Array.isArray(value) ? value.length : 0;
}

async function runLive(): Promise<void> {
  const { createClient } = await import("@sanity/client");

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
  // No fallback dataset string on purpose: a silent default is how a check ends up
  // confidently validating the wrong dataset (research Pitfall 6).
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  assert.ok(projectId, "NEXT_PUBLIC_SANITY_PROJECT_ID is required for a live run (use --env-file .env.local)");
  assert.ok(dataset, "NEXT_PUBLIC_SANITY_DATASET is required for a live run and has no default");

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  const totalPosts = await client.fetch<number>(`count(*[_type == "post"])`);

  // Operator-visible header BEFORE any assertion. Never logs the token or the env.
  console.log(`live: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} posts=${totalPosts}`);

  // ── Live 1. D-03 fragment behaviour against the real GROQ engine ───────────
  // Filters a literal array, so this is read-only and independent of dataset contents.
  const kept = await client.fetch<string[]>(
    `[{"id":"fa","language":"fa"},{"id":"en","language":"en"},{"id":"none"}][ ${EN_LANGUAGE} ].id`,
  );
  assert.deepStrictEqual(
    kept,
    ["en", "none"],
    `the D-03 fragment must keep the explicit English item and the item with no language field, and drop the Farsi one. Got: ${JSON.stringify(kept)}`,
  );
  console.log(`  fragment behaviour: kept ${JSON.stringify(kept)}, dropped "fa"`);

  // ── Live 2. Result-set parity, with and without the language clause ────────
  const postSlug = await client.fetch<string | null>(
    `*[_type == "post" && ${STATUS_APPROVED} && defined(slug.current)][0].slug.current`,
  );
  const authorSlug = await client.fetch<string | null>(
    `*[_type == "post" && defined(author->slug.current)][0].author->slug.current`,
  );
  const authorId = await client.fetch<string | null>(
    `*[_type == "post" && defined(author._ref)][0].author._ref`,
  );
  assert.ok(postSlug, "no approved post with a slug found: the parity run would be vacuous");
  assert.ok(authorSlug, "no post with an author slug found: the parity run would be vacuous");
  assert.ok(authorId, "no post with an author reference found: the parity run would be vacuous");

  const PARAMS: Readonly<Record<string, Record<string, string>>> = {
    blogIndexQuery: {},
    homePageQuery: {},
    postBySlugQuery: { slug: postSlug },
    postStaticParamsQuery: {},
    postMetadataBySlugQuery: { slug: postSlug },
    postsByAuthorSlugQuery: { slug: authorSlug },
    sitemapQuery: {},
    postsByAuthorIdQuery: { authorId, siteUrl },
    authorReviewPostsQuery: { authorId },
  };

  for (const [name, text] of QUERIES) {
    const stripped = stripLanguageClause(text);
    assert.strictEqual(
      countOf(stripped, EN_LANGUAGE),
      0,
      `${name}: the stripped variant still carries the language clause, so parity would be vacuous`,
    );
    assert.notStrictEqual(
      stripped,
      text,
      `${name}: stripping the language clause changed nothing, so the clause is missing`,
    );

    const params = PARAMS[name]!;
    const withFilter = await client.fetch<unknown>(text, params);
    const withoutFilter = await client.fetch<unknown>(stripped, params);
    assert.strictEqual(
      JSON.stringify(withFilter),
      JSON.stringify(withoutFilter),
      `${name} is NOT inert: its result set differs with and without the language clause. No document in this dataset carries a language field yet, so something other than the language clause changed.`,
    );

    const rows = ROW_COUNTERS[name]!(withFilter);
    if (MUST_BE_NON_EMPTY.includes(name)) {
      assert.ok(rows > 0, `${name} returned 0 rows: a silently emptied listing cannot pass`);
    }
    console.log(`  parity ${name}: identical, ${rows} row(s)`);
  }

  // ── Live 3. Slug uniqueness, which protects the post page's [0] read ───────
  // One round trip: each post row carries the English match count for its own slug.
  const slugRows = await client.fetch<{ slug: string; enCount: number }[]>(
    `*[_type == "post" && defined(slug.current)]{
      "slug": slug.current,
      "enCount": count(*[_type == "post" && slug.current == ^.slug.current && ${EN_LANGUAGE}])
    }`,
  );
  const bySlug = new Map<string, number>();
  for (const row of slugRows) bySlug.set(row.slug, row.enCount);

  let zeroEnglish = 0;
  for (const [slug, enCount] of bySlug) {
    assert.ok(
      enCount <= 1,
      `slug "${slug}" matches ${enCount} English posts. The post page's trailing [0] would pick between them by GROQ default ordering, not by intent.`,
    );
    if (enCount === 0) zeroEnglish += 1;
  }
  assert.strictEqual(
    zeroEnglish,
    0,
    `${zeroEnglish} distinct slug(s) have no English post. That means an English source was removed while a sibling survived.`,
  );
  console.log(`  slug uniqueness: ${bySlug.size} distinct slug(s), max 1 English match each, ${zeroEnglish} with zero English matches`);

  if (wantsPostMigration) {
    // EXTENSION POINT for plan 02-04: assert count(*[_type == "post" && !defined(language)]) == 0
    // once the migration has stamped language: "en" on every existing post.
    console.log("  post-migration: no assertions yet, plan 02-04 adds them");
  }

  console.log("language-filter.check.ts: ALL PASS");
}

if (wantsLive) {
  runLive().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
