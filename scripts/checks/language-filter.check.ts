/**
 * Logic + fidelity checks for the English-language filter in src/sanity/lib/queries.ts (CONTENT-02),
 * the three sibling-document schema fields, and the Studio structure split (CONTENT-01).
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
  translationCandidatesQuery,
  translationStaleQuery,
} from "../../src/sanity/lib/queries";
import { postType } from "../../src/sanity/schemaTypes/postType";

const QUERIES_PATH = "src/sanity/lib/queries.ts";
const POST_TYPE_PATH = "src/sanity/schemaTypes/postType.ts";
const STRUCTURE_PATH = "src/sanity/structure.ts";

/** The only two code paths that create a post document (D-04). */
const POST_WRITERS: readonly string[] = [
  "src/app/api/v1/posts/route.ts",
  "src/app/api/dashboard/author/submit-post/route.ts",
];
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
// CONTENT-02 is about the PUBLIC READ predicate, and that predicate has exactly
// one home: EN_LANGUAGE in queries.ts. The other two carriers are Studio chrome,
// which is a separate surface an authenticated editor sees and no visitor can
// reach, so their duplication is deliberate and permanent:
//   - postType.ts carries the predicate inside the translationOf reference-picker
//     resolver (D-07). It constrains an editor's picker, never a public read.
//   - structure.ts carries it twice, once per language-filtered document list
//     (D-05). The structure builder cannot import a GROQ fragment meant for the
//     content client without dragging server-read concerns into Studio config.
// This list is closed. A fourth file failing this assertion is not a bookkeeping
// nuisance to be waved through by appending a path: it means the predicate has
// started to spread, and the new carrier should import EN_LANGUAGE instead.
const ALLOWED_LANGUAGE_TEXT_FILES: readonly string[] = [
  QUERIES_PATH,
  POST_TYPE_PATH,
  STRUCTURE_PATH,
];
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

// ── I. Schema shape of the three sibling-document fields (CONTENT-01) ─────────
const schemaFields = (postType as unknown as { fields: Array<Record<string, unknown>> }).fields;
const byName: Record<string, Record<string, unknown>> = Object.fromEntries(
  schemaFields.map((f) => [f.name as string, f]),
);

function optionsOf(field: Record<string, unknown>): Record<string, unknown> {
  return (field.options ?? {}) as Record<string, unknown>;
}

// Deliberate tripwire. If a later phase adds a field to postType without updating
// this number, the failure points at the check rather than at silent model drift.
//
// 17 -> 18 in plan 03-02: `sourceUpdatedAt` (datetime, readOnly, hidden unless the
// document is Farsi) records the English source revision a translation was made
// from, which is what makes D-08 staleness exact. Comparing the two documents'
// `_updatedAt` values instead would need no field, but Saeid reviewing and editing
// a Farsi draft bumps that draft's `_updatedAt` and would make a stale translation
// look permanently fresh. No companion `translatedAt` field was added: the draft's
// own `_createdAt` already answers when it was translated.
const EXPECTED_FIELD_COUNT = 18;
assert.strictEqual(
  schemaFields.length,
  EXPECTED_FIELD_COUNT,
  `${POST_TYPE_PATH} has ${schemaFields.length} fields, expected ${EXPECTED_FIELD_COUNT}. If a field was added on purpose, update this count and say why in the plan.\n  found: ${schemaFields.map((f) => f.name as string).join(", ")}`,
);

const languageField = byName.language;
assert.ok(languageField, "postType must define the `language` field (roadmap criterion 4)");
assert.strictEqual(languageField.type, "string", "`language` must be a string field");
assert.strictEqual(
  languageField.initialValue,
  "en",
  "`language` must carry initialValue \"en\" (roadmap criterion 4). Note this is the Studio-form backup; the API stamps are the primary control (D-04).",
);
const languageValues = ((optionsOf(languageField).list ?? []) as Array<Record<string, unknown>>).map(
  (entry) => entry.value,
);
assert.deepStrictEqual(
  languageValues,
  ["en", "fa"],
  `\`language\` must offer exactly the values en and fa, because plan 02-05's Studio split filters on exactly those. Got: ${JSON.stringify(languageValues)}`,
);

const translationOfField = byName.translationOf;
assert.ok(translationOfField, "postType must define the `translationOf` field");
assert.strictEqual(translationOfField.type, "reference", "`translationOf` must be a reference field");
assert.strictEqual(
  optionsOf(translationOfField).disableNew,
  true,
  "`translationOf` must set options.disableNew, so no new post can be minted from inside the picker (D-07)",
);
assert.strictEqual(
  typeof optionsOf(translationOfField).filter,
  "function",
  "`translationOf` must use the resolver form of options.filter, since the predicate needs the current document id to exclude itself (D-07)",
);

const translationNotesField = byName.translationNotes;
assert.ok(translationNotesField, "postType must define the `translationNotes` field");
assert.strictEqual(translationNotesField.type, "text", "`translationNotes` must be a text field");
assert.strictEqual(
  translationNotesField.readOnly,
  true,
  "`translationNotes` must be read-only: it is written by the pipeline's verify pass, not by hand (D-08)",
);

// ── J. Studio structure split (CONTENT-01, D-05, threats T-02-21/22/23/24) ───
// Source-text assertions, so this belongs in the offline section: the Studio is a
// client application behind auth and cannot be driven from a script. What CAN be
// pinned mechanically is the shape of its config, and every assertion below maps
// to a failure mode that is silent in the browser.
const structureSource = fs.readFileSync(STRUCTURE_PATH, "utf8");

/** The Farsi side is a plain equality: Farsi is always stamped explicitly (D-05). */
const FA_LANGUAGE_EQUALITY = 'language == "fa"';

/** Each id is set twice on purpose: once on the list item, once on its child list. */
const STRUCTURE_LIST_IDS: ReadonlyArray<readonly [string, string]> = [
  ["posts-en", "English"],
  ["posts-fa", "Farsi"],
];

for (const [listId, languageWord] of STRUCTURE_LIST_IDS) {
  const idCount = countOf(structureSource, `"${listId}"`);
  assert.strictEqual(
    idCount,
    2,
    `${STRUCTURE_PATH} must set the id "${listId}" exactly twice, on the list item and on its child list, found ${idCount}. The default id of a document type list is the type name, so without both ids the two post lists collide in Studio pane state and in the URL (T-02-22).`,
  );
  // Deliberately not the full literal: D-05's separator is Studio wording Saeid
  // may want to change ("Posts — English" vs "Posts (English)"), and that is not
  // a defect. What must not drift is which language each list is labelled with.
  const titles = structureSource.match(new RegExp(`\\.title\\("Posts[^"]*${languageWord}"\\)`, "g")) ?? [];
  assert.strictEqual(
    titles.length,
    2,
    `${STRUCTURE_PATH} must title both the "${listId}" list item and its child list with a Posts title containing "${languageWord}", found ${titles.length}`,
  );
}

// A custom .filter() REPLACES the preset `_type == $type` filter rather than
// appending to it. Dropping the clause from either filter would list every
// document type in the dataset to any editor (T-02-21).
const structureTypeClauses = countOf(structureSource, POST_TYPE_PREDICATE);
assert.strictEqual(
  structureTypeClauses,
  2,
  `both Studio list filters must restate ${POST_TYPE_PREDICATE} themselves, found ${structureTypeClauses} occurrence(s) in ${STRUCTURE_PATH}`,
);

// Serialising a document list whose filter differs from the preset warns without
// an explicit api version, and the warning says it will become required.
const apiVersionCalls = (structureSource.match(/\.apiVersion\(/g) ?? []).length;
assert.strictEqual(
  apiVersionCalls,
  2,
  `both filtered lists in ${STRUCTURE_PATH} need an explicit .apiVersion(), found ${apiVersionCalls}`,
);
const importedApiVersionCalls = (structureSource.match(/\.apiVersion\(\s*apiVersion\s*\)/g) ?? []).length;
assert.strictEqual(
  importedApiVersionCalls,
  2,
  `${STRUCTURE_PATH} must pass the apiVersion constant imported from ./env, not a hardcoded date string, to both lists. Found ${importedApiVersionCalls} of ${apiVersionCalls} calls using the constant.`,
);
assert.match(
  structureSource,
  /import\s*\{\s*apiVersion\s*\}\s*from\s*"\.\/env"/,
  `${STRUCTURE_PATH} must import apiVersion from ./env, matching how src/sanity/lib/client.ts reads it`,
);

// Farsi documents come only from the Phase 3 pipeline. A document created through
// a Studio form in the Farsi list would take the English initial value and land
// misclassified, so the create button is removed from that list only (T-02-23).
const emptyTemplateCalls = (structureSource.match(/\.initialValueTemplates\(\s*\[\s*\]\s*\)/g) ?? []).length;
assert.strictEqual(
  emptyTemplateCalls,
  1,
  `${STRUCTURE_PATH} must call .initialValueTemplates([]) exactly once, on the Farsi list only, found ${emptyTemplateCalls}`,
);
const faFilterIndex = structureSource.indexOf(FA_LANGUAGE_EQUALITY);
const templatesIndex = structureSource.search(/\.initialValueTemplates\(\s*\[\s*\]\s*\)/);
assert.ok(
  faFilterIndex !== -1 && templatesIndex > faFilterIndex,
  `the empty initialValueTemplates call in ${STRUCTURE_PATH} must sit after the Farsi filter, so it disables creation on the Farsi list and not the English one`,
);

// Tolerant on the English side so a post that somehow lacks a language value is
// still visible and editable somewhere rather than invisible in both lists
// (T-02-24). Strict on the Farsi side, since Farsi is always explicit by design.
const tolerantInStructure = countOf(structureSource, D03_PREDICATE);
assert.strictEqual(
  tolerantInStructure,
  1,
  `the English Studio filter must use the tolerant predicate ${D03_PREDICATE} exactly once, found ${tolerantInStructure}`,
);
const strictFaInStructure = countOf(structureSource, FA_LANGUAGE_EQUALITY);
assert.strictEqual(
  strictFaInStructure,
  1,
  `the Farsi Studio filter must be the plain equality ${FA_LANGUAGE_EQUALITY}, found ${strictFaInStructure} occurrence(s)`,
);

assert.ok(
  !/documentTypeListItem\(\s*["']post["']\s*\)/.test(structureSource),
  `the stock post documentTypeListItem is still present in ${STRUCTURE_PATH}. It must be replaced by the two split lists, or posts are listed three times.`,
);

// ── K. Write-path stamps (D-04, threat T-02-10) ──────────────────────────────
// initialValue is a Studio form affordance and never runs for client.create, so
// every post-creating route must stamp the language itself.
const LANGUAGE_STAMP = /language:\s*"en"/g;
for (const writer of POST_WRITERS) {
  const source = fs.readFileSync(writer, "utf8");
  const stamps = (source.match(LANGUAGE_STAMP) ?? []).length;
  assert.strictEqual(
    stamps,
    1,
    `${writer} must stamp \`language: "en"\` on the document it creates exactly once (D-04), found ${stamps}`,
  );
}

// ── L. Pipeline selection queries (PIPE-01) ──────────────────────────────────
// The two pipeline reads are deliberately NOT in the QUERIES array above: that
// array is the nine PUBLIC post queries, and assertions B and C encode CONTENT-02's
// public read contract through its expected counts. A script-side read is a
// different surface, so it is pinned here instead, on its own terms.
const PIPELINE_QUERIES: ReadonlyArray<readonly [string, string]> = [
  ["translationCandidatesQuery", translationCandidatesQuery],
  ["translationStaleQuery", translationStaleQuery],
];

for (const [name, text] of PIPELINE_QUERIES) {
  const enCount = countOf(text, EN_LANGUAGE);
  assert.strictEqual(
    enCount,
    1,
    `${name} carries the English predicate ${enCount} time(s), expected 1. It must interpolate EN_LANGUAGE once and never retype the literal.`,
  );

  const approvedCount = countOf(text, STATUS_APPROVED);
  assert.strictEqual(
    approvedCount,
    1,
    `${name} carries ${STATUS_APPROVED} ${approvedCount} time(s), expected 1. The pipeline translates approved English posts only.`,
  );
  for (const [label, variant] of [
    ["tolerant", STATUS_TOLERANT],
    ["strict", STATUS_STRICT],
  ] as const) {
    assert.ok(
      !text.includes(variant),
      `${name} carries the ${label} status variant. The pipeline must select on ${STATUS_APPROVED} alone: a scheduled or status-less post is not a translation source. Replace the interpolation with STATUS_APPROVED.`,
    );
  }

  // Assertion D already proves that queries.ts interpolates nothing but the four
  // allowlisted fragment names, so all that is left to prove here is that the
  // runtime slug is present AS a parameter rather than absent entirely (T-03-09).
  assert.ok(
    text.includes("$slug"),
    `${name} does not reference $slug. A --slug value must reach GROQ as a parameter; expected the filter clause (!defined($slug) || slug.current == $slug).`,
  );

  const DRAFT_PATH_EXCLUSION = 'path("drafts.**")';
  assert.ok(
    text.includes(DRAFT_PATH_EXCLUSION),
    `${name} does not exclude ${DRAFT_PATH_EXCLUSION}. Under the raw perspective the pipeline needs to see Farsi drafts, which means it can also see English drafts, and a draft English document must never be treated as a translation source.`,
  );
}

// The sibling test is the only difference between the two queries, which makes it
// the clause most likely to survive a copy-paste unchanged and be wrong in silence.
const SIBLING_ABSENT = ") == 0";
const SIBLING_PRESENT = ") > 0";
assert.ok(
  translationCandidatesQuery.includes(SIBLING_ABSENT) &&
    !translationCandidatesQuery.includes(SIBLING_PRESENT),
  `translationCandidatesQuery must close its sibling count with "${SIBLING_ABSENT}" and not "${SIBLING_PRESENT}". It selects posts that have NO Farsi sibling; inverted, it would hand the pipeline every already-translated post.`,
);
assert.ok(
  translationStaleQuery.includes(SIBLING_PRESENT) &&
    !translationStaleQuery.includes(SIBLING_ABSENT),
  `translationStaleQuery must close its sibling count with "${SIBLING_PRESENT}" and not "${SIBLING_ABSENT}". It reports posts that HAVE a Farsi sibling; inverted, it would report every untranslated post as stale.`,
);

assert.ok(
  translationStaleQuery.includes("sourceUpdatedAt"),
  `translationStaleQuery must project the sibling's sourceUpdatedAt: it is the recorded source revision that staleness is measured against (D-08).`,
);

console.log(
  `offline: fragment identity OK, ${totalEn} interpolations across ${QUERIES.length} queries, status predicates intact, ${interpolations.length} interpolations all allowlisted, 9/9 faithful to ${preExtractionRef.slice(0, 7)}, ${CALL_SITES.length} call sites free of inline GROQ, ${srcFiles.length} src files scanned, sole carrier ${carriers.join(", ")}, ${schemaFields.length} schema fields with language/translationOf/translationNotes intact, Studio split pinned (${STRUCTURE_LIST_IDS.map(([id]) => id).join(" + ")}, ${structureTypeClauses} type clauses, ${apiVersionCalls} apiVersion calls, ${emptyTemplateCalls} create-disabled list), ${POST_WRITERS.length}/${POST_WRITERS.length} post writers stamping language, ${PIPELINE_QUERIES.length} pipeline selection queries pinned (PIPE-01)`,
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

  // ── Live 4. Pipeline selection behaviour (PIPE-01) ─────────────────────────
  // A third client, configured raw, for the same reason the post-migration block
  // builds its own: the parity assertions above must keep running through the
  // default published perspective, because that is what the app sees, while the
  // pipeline queries must see drafts. Farsi siblings exist only as drafts, so a
  // published-perspective sibling count is 0 by construction and would make this
  // section pass without proving anything (research Pitfall 1).
  const pipelineClient = createClient({
    projectId,
    dataset,
    apiVersion,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "raw",
  });

  type PipelineRow = { _id: string; slug: string | null };

  // The control count restates the candidates query's filter minus the sibling
  // test, so any difference between the two is the sibling test and nothing else.
  const approvedEnglish = await pipelineClient.fetch<number>(
    `count(*[_type == "post" && !(_id in path("drafts.**")) && ${EN_LANGUAGE} && ${STATUS_APPROVED}])`,
  );
  const candidates = await pipelineClient.fetch<PipelineRow[]>(translationCandidatesQuery, {
    slug: null,
  });
  const stale = await pipelineClient.fetch<PipelineRow[]>(translationStaleQuery, { slug: null });

  console.log(
    `  pipeline selection: dataset=${dataset} (raw perspective) approved-english=${approvedEnglish} candidates=${candidates.length} stale=${stale.length}`,
  );

  // Today every sibling count is 0, because no Farsi document exists in either
  // dataset. That makes the two numbers below the whole assertion: candidates is
  // the full approved English set, and stale is empty. The non-zero branch of the
  // sibling subquery is therefore NOT exercised here and cannot be, since this
  // check is read-only and must not fabricate a Farsi document. It is proven in
  // plan 03-09's dev rehearsal, against drafts the pipeline itself wrote.
  assert.strictEqual(
    candidates.length,
    approvedEnglish,
    `translationCandidatesQuery returned ${candidates.length} row(s) but ${approvedEnglish} approved English post(s) exist and none has a Farsi sibling yet. The sibling count subquery is excluding posts it should not, or the perspective is not raw.`,
  );
  assert.strictEqual(
    stale.length,
    0,
    `translationStaleQuery returned ${stale.length} row(s), expected 0: no Farsi sibling exists in dataset ${dataset}, so nothing can be stale. Check that its sibling count comparison is "> 0" and not "== 0".`,
  );
  assert.ok(
    candidates.length > 0,
    `translationCandidatesQuery returned 0 rows against ${dataset}, so the $slug assertion below would be vacuous`,
  );

  // Proves the parameter path end to end: the slug reaches GROQ as $slug and
  // narrows the result set, which is what keeps a --slug value off the query text.
  const firstSlug = candidates[0]!.slug;
  assert.ok(firstSlug, "the first candidate has no slug, so the $slug path cannot be proven");
  const oneCandidate = await pipelineClient.fetch<PipelineRow[]>(translationCandidatesQuery, {
    slug: firstSlug,
  });
  assert.strictEqual(
    oneCandidate.length,
    1,
    `translationCandidatesQuery with slug="${firstSlug}" returned ${oneCandidate.length} row(s), expected exactly 1. Either $slug is not being applied, or the slug is not unique among English posts.`,
  );
  assert.strictEqual(
    oneCandidate[0]!.slug,
    firstSlug,
    `translationCandidatesQuery with slug="${firstSlug}" returned a row for "${oneCandidate[0]!.slug}"`,
  );
  console.log(`  pipeline $slug path: slug="${firstSlug}" narrowed ${candidates.length} row(s) to 1`);

  if (wantsPostMigration) {
    // Independent completeness verification of plan 02-04's migration. It re-counts
    // through its OWN client rather than trusting the migration's success line.
    //
    // A second client, configured raw, is deliberate. The parity assertions above
    // must keep using the default published perspective, because that is what the
    // app sees. The completeness count must see drafts too, because an unstamped
    // draft is still an unstamped document.
    const rawClient = createClient({
      projectId,
      dataset,
      apiVersion,
      token: process.env.SANITY_API_TOKEN,
      useCdn: false,
      perspective: "raw",
    });

    const [unstamped, enCount, faCount] = await Promise.all([
      rawClient.fetch<number>(`count(*[_type == "post" && !defined(language)])`),
      rawClient.fetch<number>(`count(*[_type == "post" && language == "en"])`),
      rawClient.fetch<number>(`count(*[_type == "post" && language == "fa"])`),
    ]);

    console.log(
      `  post-migration: dataset=${dataset} (raw perspective) language distribution en=${enCount} fa=${faCount} none=${unstamped}`,
    );
    assert.strictEqual(
      unstamped,
      0,
      `${unstamped} post document(s) in dataset ${dataset} still have no language field. The migration has not completed against this dataset: run npx tsx --env-file <env> scripts/migrate-post-language.ts --execute`,
    );
  }

  console.log("language-filter.check.ts: ALL PASS");
}

if (wantsLive) {
  runLive().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
