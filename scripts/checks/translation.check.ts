/**
 * Correctness proof for the translation pipeline's pure core: the Portable Text walker
 * (scripts/lib/portable-text-walk.ts), the D-05 tier 1 structural fingerprint gate, the
 * translationNotes formatter (scripts/lib/translation-notes.ts), and the glossary loader and
 * its deterministic prompt block (scripts/lib/glossary.ts).
 * Run: npx tsx scripts/checks/translation.check.ts | live: npx tsx --env-file .env.local scripts/checks/translation.check.ts --live
 * The offline section needs no env, no network and no model. Only --live touches the Content Lake, read-only.
 * --post-run asserts against Farsi drafts the pipeline actually wrote:
 *   npx tsx --env-file .env.local scripts/checks/translation.check.ts --post-run [--slug <value>]
 * With --slug it inspects one post's source and sibling; without one it inspects every Farsi document in
 * the dataset. It is read-only in both modes and it reads Sanity through the raw perspective, because a
 * Farsi sibling only ever exists as a draft.
 */
import assert from "node:assert";
import {
  applyTranslatables,
  extractTranslatables,
  structuralFingerprint,
  toTexts,
  type Body,
  type Span,
  type Translatable,
} from "../lib/portable-text-walk";
import { formatNotes, todayIso, type Finding } from "../lib/translation-notes";
import {
  glossaryTermIndex,
  loadGlossary,
  serializeGlossaryBlock,
  MAX_ENTRIES,
  MIN_ENTRIES,
  STRATEGIES,
} from "../lib/glossary";
import { EN_LANGUAGE, STATUS_APPROVED } from "../../src/sanity/lib/queries";

const argv = process.argv.slice(2);
const wantsLive = argv.includes("--live");
const wantsPostRun = argv.includes("--post-run");

/** `--slug <value>`, in the same shape scripts/translate-posts.ts parses its flags. */
function flagValue(name: string): string | null {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("--")) return null;
  return value;
}

// ── The fixture ──────────────────────────────────────────────────────────────
// One body carrying every shape the corpus census measured, plus the two shapes
// blockContentType.ts does not declare but markdownToPortableText.ts can emit
// (listItem: "number", marks: ["code"]), plus one shape that does not exist in the
// corpus at all: a `code` block. The code block is the whole point of section E. The
// walker has no `code` branch by design, so the only way to prove that an unknown
// _type survives untouched is to invent one here and put it through the round trip.
// Hand-count of translatable slots is asserted in section A, not derived from the walker.

const IX_LINK_BLOCK = 0;
const IX_HEADING = 1;
const IX_QUOTE = 2;
const IX_BULLET = 3;
const IX_NUMBERED = 4;
const IX_CODE_MARK = 5;
const IX_TABLE = 6;
const IX_IMAGE = 7;
const IX_VIDEO = 8;
const IX_CODE_BLOCK = 9;

const FIXTURE: Body = [
  {
    _key: "b-link",
    _type: "block",
    style: "normal",
    level: 1,
    markDefs: [{ _key: "mk-1", _type: "link", href: "https://www.udi.no/en/word-definitions/" }],
    children: [
      { _key: "s-1", _type: "span", marks: [], text: "Applicants should read " },
      { _key: "s-2", _type: "span", marks: ["mk-1"], text: "the official guidance" },
    ],
  },
  {
    _key: "b-h2",
    _type: "block",
    style: "h2",
    level: 1,
    markDefs: [],
    children: [{ _key: "s-3", _type: "span", marks: [], text: "What the numbers actually say" }],
  },
  {
    _key: "b-quote",
    _type: "block",
    style: "blockquote",
    level: 1,
    markDefs: [],
    children: [{ _key: "s-4", _type: "span", marks: ["em"], text: "Structure is not negotiable." }],
  },
  {
    _key: "b-bullet",
    _type: "block",
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [],
    children: [{ _key: "s-5", _type: "span", marks: [], text: "A bullet item" }],
  },
  {
    // listItem: "number" is undeclared in blockContentType.ts and present in real data.
    _key: "b-number",
    _type: "block",
    style: "normal",
    level: 1,
    listItem: "number",
    markDefs: [],
    children: [{ _key: "s-6", _type: "span", marks: [], text: "A numbered item" }],
  },
  {
    _key: "b-codemark",
    _type: "block",
    style: "normal",
    level: 1,
    markDefs: [],
    children: [
      // marks: ["code"] is the second undeclared shape. It is still a span, so it is still
      // translatable; the decorator itself rides along untouched inside `marks`.
      { _key: "s-7", _type: "span", marks: ["code"], text: "npm ci" },
      // An empty text leaf. It must contribute nothing and be skipped identically on apply.
      { _key: "s-8", _type: "span", marks: [], text: "" },
    ],
  },
  {
    _key: "b-table",
    _type: "table",
    rows: [
      { _key: "r-1", _type: "tableRow", cells: ["Metric", "Norway", "EU average"] },
      // The empty cell contributes nothing, exactly like the empty span above.
      { _key: "r-2", _type: "tableRow", cells: ["Median salary", "", "780,000 NOK"] },
    ],
  },
  {
    _key: "b-image",
    _type: "image",
    alignment: "full",
    alt: "A line chart of median salaries by sector",
    width: 800,
    asset: { _ref: "image-abc123def456-1200x630-png", _type: "reference" },
    crop: { top: 0, bottom: 0, left: 0, right: 0 },
    hotspot: { x: 0.5, y: 0.5, height: 1, width: 1 },
  },
  {
    _key: "b-video",
    _type: "video",
    source: "external",
    url: "https://www.youtube.com/watch?v=example",
    caption: "A walkthrough of the application form",
  },
  {
    // Synthetic. Zero code blocks exist in either dataset, which is precisely why this one
    // has to exist here: rule 5 of the walker gets proven rather than assumed.
    _key: "b-code",
    _type: "code",
    language: "typescript",
    code: "const answer: number = 42;\nexport default answer;",
    filename: "answer.ts",
  },
];

assert.strictEqual(FIXTURE[IX_LINK_BLOCK]!._type, "block", "fixture index drift: IX_LINK_BLOCK");
assert.strictEqual(FIXTURE[IX_HEADING]!.style, "h2", "fixture index drift: IX_HEADING");
assert.strictEqual(FIXTURE[IX_QUOTE]!.style, "blockquote", "fixture index drift: IX_QUOTE");
assert.strictEqual(FIXTURE[IX_BULLET]!.listItem, "bullet", "fixture index drift: IX_BULLET");
assert.strictEqual(FIXTURE[IX_NUMBERED]!.listItem, "number", "fixture index drift: IX_NUMBERED");
assert.strictEqual(FIXTURE[IX_CODE_MARK]!._type, "block", "fixture index drift: IX_CODE_MARK");
assert.strictEqual(FIXTURE[IX_TABLE]!._type, "table", "fixture index drift: IX_TABLE");
assert.strictEqual(FIXTURE[IX_IMAGE]!._type, "image", "fixture index drift: IX_IMAGE");
assert.strictEqual(FIXTURE[IX_VIDEO]!._type, "video", "fixture index drift: IX_VIDEO");
assert.strictEqual(FIXTURE[IX_CODE_BLOCK]!._type, "code", "fixture index drift: IX_CODE_BLOCK");

// ── A. Enumeration ───────────────────────────────────────────────────────────
// Hand-counted from the fixture above, deliberately NOT from the walker's own output:
//   block[0] 2 spans, block[1] 1, block[2] 1, block[3] 1, block[4] 1, block[5] 1 (the empty
//   span contributes nothing) = 7 spans; table[6] 5 non-empty cells of 6; image[7] alt = 1;
//   video[8] caption = 1; code[9] = 0.
const EXPECTED_SLOTS = 14;
const EXPECTED_KINDS: ReadonlyArray<Translatable["kind"]> = [
  "span",
  "span",
  "span",
  "span",
  "span",
  "span",
  "span",
  "cell",
  "cell",
  "cell",
  "cell",
  "cell",
  "alt",
  "caption",
];

const items = extractTranslatables(FIXTURE);

// Anti-vacuity first: a walker that returned nothing at all would satisfy several of the
// assertions below by doing no work, and the round trip would be trivially byte identical.
assert.ok(
  items.length > 0,
  "extractTranslatables returned 0 items for a fixture built to contain translatable text. Every assertion below would then be vacuous.",
);
assert.strictEqual(
  items.length,
  EXPECTED_SLOTS,
  `the fixture enumerates ${items.length} translatable slot(s), expected ${EXPECTED_SLOTS}. If the fixture changed on purpose, re-do the hand count above and say why in the plan.\n  found: ${items.map((i) => i.label).join(", ")}`,
);
assert.deepStrictEqual(
  items.map((i) => i.kind),
  EXPECTED_KINDS,
  `the kind sequence is wrong. Document order is blocks, then table cells row by row, then image alt, then video caption.\n  found: ${JSON.stringify(items.map((i) => i.kind))}`,
);

// Labels are the location context the verify pass and translationNotes report against, so the
// format is a contract with plan 03-08, not a debugging convenience. One spot check per kind.
assert.strictEqual(items[0]!.label, "block[0]/span[0]", `first span label: got ${items[0]!.label}`);
assert.strictEqual(items[6]!.label, "block[5]/span[0]", `code-marked span label: got ${items[6]!.label}`);
assert.strictEqual(items[7]!.label, "table[6]/row[0]/cell[0]", `first cell label: got ${items[7]!.label}`);
assert.strictEqual(items[11]!.label, "table[6]/row[1]/cell[2]", `last cell label: got ${items[11]!.label}`);
assert.strictEqual(items[12]!.label, "image[7]/alt", `image alt label: got ${items[12]!.label}`);
assert.strictEqual(items[13]!.label, "video[8]/caption", `video caption label: got ${items[13]!.label}`);

// The empty span and the empty cell must be absent from the enumeration entirely, not present
// as empty strings: an empty slot handed to a model comes back as invented prose.
assert.ok(
  !items.some((i) => i.text === ""),
  `the enumeration contains an empty-string slot. Empty leaves must be skipped, not sent for translation.`,
);

// ── B. Identity round trip ───────────────────────────────────────────────────
const identity = applyTranslatables(FIXTURE, toTexts(items));
assert.deepStrictEqual(
  identity,
  FIXTURE,
  "applying the extracted strings back unchanged did not reproduce the source body. Reassembly is writing somewhere it should not.",
);
assert.strictEqual(
  JSON.stringify(identity),
  JSON.stringify(FIXTURE),
  "the identity round trip is deep-equal but not byte identical, which means key order moved. The fingerprint gate compares serialised text, so key order is part of the contract.",
);

// ── C. Substitution invariance ───────────────────────────────────────────────
const substituted = applyTranslatables(
  FIXTURE,
  items.map((_, i) => `ترجمه ${i}`),
);
assert.notStrictEqual(
  JSON.stringify(substituted),
  JSON.stringify(FIXTURE),
  "substituting every translatable string changed nothing, so the substitution never happened and the invariance below proves nothing.",
);
assert.strictEqual(
  structuralFingerprint(substituted),
  structuralFingerprint(FIXTURE),
  "the fingerprint changed under a pure text substitution. The gate would refuse every legitimate translation.",
);

const reEnumerated = extractTranslatables(substituted);
assert.strictEqual(
  reEnumerated.length,
  items.length,
  `re-enumerating the substituted body found ${reEnumerated.length} slot(s), expected ${items.length}. Translation changed which slots exist.`,
);
assert.deepStrictEqual(
  reEnumerated.map((i) => i.kind),
  items.map((i) => i.kind),
  "re-enumerating the substituted body produced a different kind sequence.",
);
assert.deepStrictEqual(
  reEnumerated.map((i) => i.label),
  items.map((i) => i.label),
  "re-enumerating the substituted body produced different labels, so a finding's location would not point at the same slot twice.",
);

// ── D. Fingerprint sensitivity: the negative cases ───────────────────────────
// This is the section that matters. A failure here does NOT mean a test needs updating: it
// means the gate has stopped detecting structural mutation, and the gate is the only thing
// standing between a model's response and the content store. Each clone below moves exactly
// one thing that a naive whole-document translation is known to move.
const BASE_FINGERPRINT = structuralFingerprint(FIXTURE);

const MUTATIONS: ReadonlyArray<readonly [string, (body: Body) => void]> = [
  [
    "a span _key",
    (b) => {
      (b[IX_LINK_BLOCK]!.children as Span[])[0]!._key = "regenerated-key";
    },
  ],
  [
    "a markDefs href",
    (b) => {
      (b[IX_LINK_BLOCK]!.markDefs as { href: string }[])[0]!.href = "https://example.com/wrong";
    },
  ],
  [
    "listItem flipped from bullet to number",
    (b) => {
      b[IX_BULLET]!.listItem = "number";
    },
  ],
  [
    "the image asset._ref",
    (b) => {
      (b[IX_IMAGE]!.asset as { _ref: string })._ref = "image-000000000000-1x1-png";
    },
  ],
  [
    "a removed block",
    (b) => {
      b.splice(IX_QUOTE, 1);
    },
  ],
  [
    "a reordered pair of children",
    (b) => {
      const children = b[IX_LINK_BLOCK]!.children as Span[];
      const first = children[0]!;
      children[0] = children[1]!;
      children[1] = first;
    },
  ],
];

for (const [name, mutate] of MUTATIONS) {
  const clone = structuredClone(FIXTURE) as Body;
  mutate(clone);
  assert.notStrictEqual(
    JSON.stringify(clone),
    JSON.stringify(FIXTURE),
    `the "${name}" mutation did not change the body at all, so the assertion below would pass without the gate doing anything.`,
  );
  assert.notStrictEqual(
    structuralFingerprint(clone),
    BASE_FINGERPRINT,
    `structuralFingerprint did NOT detect "${name}". The D-05 tier 1 gate is blind to this mutation, which means a model response carrying it would be written to the Content Lake unchallenged.`,
  );
}

// ── E. Unknown _type passthrough ─────────────────────────────────────────────
// Rule 5 of the walker: an unknown _type contributes nothing and is not recursed into.
const codeOnly = extractTranslatables([FIXTURE[IX_CODE_BLOCK]!]);
assert.strictEqual(
  codeOnly.length,
  0,
  `a body containing only a _type: "code" block enumerated ${codeOnly.length} translatable slot(s), expected 0. The walker has grown a branch that reaches into an undeclared block type.`,
);
assert.strictEqual(
  JSON.stringify(substituted[IX_CODE_BLOCK]),
  JSON.stringify(FIXTURE[IX_CODE_BLOCK]),
  `the code block was modified by a full substitution round trip. Its content, language and filename must survive byte identical, which is the "code blocks pass through untouched" success criterion.`,
);

// ── F. Count mismatch ────────────────────────────────────────────────────────
// A short or long response is the normal failure mode of asking a model for N strings. It has
// to be an exception before anything is written, never a partially translated body.
const texts = toTexts(items);
for (const [label, supplied] of [
  ["one too few", texts.slice(0, -1)],
  ["one too many", [...texts, "extra"]],
] as const) {
  assert.throws(
    () => applyTranslatables(FIXTURE, supplied),
    (err: unknown) => {
      assert.ok(err instanceof Error, `${label}: threw a non-Error value`);
      assert.ok(
        err.message.includes(String(items.length)) && err.message.includes(String(supplied.length)),
        `${label}: the thrown message must name both counts (${items.length} enumerated, ${supplied.length} supplied) so the operator can see which side is wrong. Got: ${err.message}`,
      );
      return true;
    },
    `applyTranslatables accepted ${label} string(s) without throwing.`,
  );
}

// ── G. translationNotes formatting (D-06) ────────────────────────────────────
const DATE = "2026-08-22";

assert.strictEqual(
  formatNotes([], DATE),
  `Verify pass clean (${DATE})`,
  "a clean verify pass must write one explicit line. An empty translationNotes is ambiguous between a clean pass and a pass that never ran (D-06).",
);

const FINDINGS: readonly Finding[] = [
  {
    category: "url",
    severity: "info",
    location: "block[3]/span[0]",
    summary: "Link text was localised but the href was not, which is correct",
  },
  {
    category: "number",
    severity: "warn",
    location: "block[7]/span[2]",
    summary: "42 percent became\n\tan approximate figure",
  },
];

const rendered = formatNotes(FINDINGS, DATE);
const lines = rendered.split("\n");

assert.strictEqual(
  lines.length,
  FINDINGS.length + 1,
  `expected a header plus one line per finding (${FINDINGS.length + 1} lines), got ${lines.length}.\n  rendered: ${JSON.stringify(rendered)}`,
);
assert.strictEqual(
  lines[0],
  `Verify pass ${DATE}: 2 finding(s)`,
  `header line: got ${JSON.stringify(lines[0])}`,
);
assert.ok(
  lines[1]!.startsWith("number: "),
  `the warn finding must come first: a reviewer reading a six-row Studio box sees the top lines. Got: ${JSON.stringify(lines[1])}`,
);
assert.ok(
  lines[2]!.startsWith("url: "),
  `the info finding must come second. Got: ${JSON.stringify(lines[2])}`,
);
assert.strictEqual(
  lines[1],
  "number: 42 percent became an approximate figure (block[7]/span[2])",
  `a summary carrying a newline and a tab must be collapsed to one line, or it breaks the one-line-per-finding contract. Got: ${JSON.stringify(lines[1])}`,
);

const EM_DASH = String.fromCharCode(0x2014);
assert.ok(
  !rendered.includes(EM_DASH),
  "the rendered notes contain an em dash. English prose written for Saeid never carries one; the rule stops at the Farsi body text.",
);

assert.match(
  todayIso(),
  /^\d{4}-\d{2}-\d{2}$/,
  `todayIso must return YYYY-MM-DD so no two call sites invent competing date formats. Got: ${todayIso()}`,
);

// ── H. Glossary (SC-3, D-01, D-02, D-04) ─────────────────────────────────────
// Everything here is offline: loadGlossary reads one file and serializeGlossaryBlock returns a
// string. The point of asserting it in this check rather than at run time is that a malformed
// glossary must be caught before a run starts, since the block below rides at the top of every
// single request in that run.

const glossary = loadGlossary();

// Anti-vacuity first, in the style of section A: a loader that returned an empty entries array
// would satisfy the sortedness, uniqueness and byte-identity assertions by doing nothing.
assert.ok(
  glossary.entries.length > 0,
  "loadGlossary returned 0 entries. Every glossary assertion below would then be vacuous.",
);
assert.ok(
  glossary.entries.length >= MIN_ENTRIES && glossary.entries.length <= MAX_ENTRIES,
  `the glossary carries ${glossary.entries.length} entries, outside the D-01 bound of ${MIN_ENTRIES} to ${MAX_ENTRIES}.`,
);

for (const [i, entry] of glossary.entries.entries()) {
  assert.ok(
    (STRATEGIES as readonly string[]).includes(entry.strategy),
    `glossary entries[${i}] ("${entry.term}") has strategy "${entry.strategy}", not one of ${STRATEGIES.join(", ")} (D-02).`,
  );
  assert.ok(entry.term.length > 0, `glossary entries[${i}] has an empty term.`);
  assert.ok(entry.rendering.length > 0, `glossary entries[${i}] ("${entry.term}") has an empty rendering.`);
}

const lowerTerms = glossary.entries.map((e) => e.term.toLowerCase());
assert.strictEqual(
  new Set(lowerTerms).size,
  lowerTerms.length,
  `the glossary carries a case-insensitive duplicate term. Two entries for one term mean the translator is given two different instructions for the same word.\n  terms: ${lowerTerms.filter((t, i) => lowerTerms.indexOf(t) !== i).join(", ")}`,
);

const termsInFileOrder = glossary.entries.map((e) => e.term);
assert.deepStrictEqual(
  termsInFileOrder,
  [...termsInFileOrder].sort(),
  "the glossary file is not sorted by term ascending. Sorted output is what keeps a correction a clean one-line diff rather than a reshuffle.",
);

assert.strictEqual(
  glossaryTermIndex(glossary).size,
  glossary.entries.length,
  "glossaryTermIndex lost an entry, so the verify pass would silently not check adherence for it.",
);

// Two INDEPENDENT loads, not one glossary serialised twice: this asserts determinism of the
// whole load-and-serialise path, which is the property the cached prefix and the diffability of
// the file both rest on.
const blockA = serializeGlossaryBlock(loadGlossary());
const blockB = serializeGlossaryBlock(loadGlossary());
assert.strictEqual(
  blockA,
  blockB,
  "serializeGlossaryBlock returned different bytes for two independent loads of the same glossary. Something in the block is not deterministic, which breaks the identical-instruction guarantee across a run.",
);

assert.ok(
  !/\d{4}-\d{2}-\d{2}/.test(blockA),
  `the serialised block contains a date. It must carry no timestamp: a date makes every request in a run different from the last and turns a regenerated block into a diff. Block starts: ${blockA.slice(0, 120)}`,
);

// The entry lines are exactly the tab-carrying lines; the framing lines carry no tab.
const blockLines = blockA.split("\n");
const entryLines = blockLines.filter((l) => l.includes("\t"));
assert.strictEqual(
  entryLines.length,
  glossary.entries.length,
  `the block carries ${entryLines.length} entry line(s) for ${glossary.entries.length} entries. Every entry must reach the prompt exactly once.`,
);
for (const [i, line] of entryLines.entries()) {
  const parts = line.split("\t");
  assert.strictEqual(
    parts.length,
    3,
    `block entry line ${i} has ${parts.length} tab-separated field(s), expected term, strategy, rendering. Got: ${JSON.stringify(line)}`,
  );
}
assert.deepStrictEqual(
  entryLines.map((l) => l.split("\t")[0]),
  [...termsInFileOrder].sort(),
  "the block's entry lines are not in term-ascending order, so two serialisations of differently ordered files would not match.",
);

// D-04 is a standing instruction, not decoration: without it the model has no rule for the
// terms the lean glossary deliberately omits, which is most of them.
assert.ok(
  blockA.includes("follow common Farsi tech-press usage"),
  "the block does not carry the D-04 standing instruction for terms that are not in the glossary.",
);
assert.ok(
  blockA.includes("Latin script"),
  "the block does not tell the translator that keeping English in Latin script is idiomatic where it is the norm (D-04).",
);

console.log(
  `offline: fixture ${items.length} slot(s) over ${FIXTURE.length} block(s) (${EXPECTED_KINDS.filter((k) => k === "span").length} span, ${EXPECTED_KINDS.filter((k) => k === "cell").length} cell, 1 alt, 1 caption), identity round trip byte identical, fingerprint invariant under full substitution, ${MUTATIONS.length}/${MUTATIONS.length} structural mutations detected, unknown _type "code" contributed 0 slots and survived byte identical, count mismatch throws in both directions, notes format pinned (clean line, warn before info, one-lined, no em dash)`,
);

console.log(
  `offline: glossary ${glossary.entries.length} entries (${STRATEGIES.map((s) => `${s} ${glossary.entries.filter((e) => e.strategy === s).length}`).join(", ")}), block ${blockA.length} chars over ${blockLines.length} line(s) with ${entryLines.length} entry line(s), byte identical across two independent loads, no date, D-04 standing instruction present`,
);

if (!wantsLive && !wantsPostRun) {
  console.log("translation.check.ts: ALL PASS");
}

// ── Live section: read-only, runs only under --live ──────────────────────────

type LivePost = { slug: string | null; body: unknown };

async function runLive(): Promise<void> {
  const { createClient } = await import("@sanity/client");

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
  // No fallback dataset string on purpose: a silent default is how a check ends up
  // confidently validating the wrong dataset (research Pitfall 2).
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

  assert.ok(
    projectId,
    "NEXT_PUBLIC_SANITY_PROJECT_ID is required for a live run (use --env-file .env.local or --env-file .env.vercel-prod)",
  );
  assert.ok(dataset, "NEXT_PUBLIC_SANITY_DATASET is required for a live run and has no default");

  // One client, configured raw, because the pipeline itself runs raw: Farsi siblings exist
  // only as drafts and the default published perspective at this apiVersion cannot see a
  // drafts.* document at all (research Pitfall 1). Reading the sources through the same
  // perspective the pipeline uses is the only way this proves anything about the pipeline.
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "raw",
  });

  // Not translationCandidatesQuery: that one projects _id and slug only, deliberately, so
  // selection never drags a body across the wire. This section needs the bodies.
  const posts = await client.fetch<LivePost[]>(
    `*[_type == "post" && !(_id in path("drafts.**")) && ${EN_LANGUAGE} && ${STATUS_APPROVED}]{
      "slug": slug.current,
      body
    }`,
  );

  // Operator-visible header BEFORE any assertion. Never logs the token or the env.
  console.log(
    `live: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} (raw perspective) approved-english=${posts.length}`,
  );

  assert.ok(
    posts.length > 0,
    `no approved English post found in dataset ${dataset}. Every assertion below would be vacuous.`,
  );

  let totalSlots = 0;
  let totalBlocks = 0;
  let bodiless = 0;
  let largest: { slug: string; blocks: number; slots: number; chars: number } | null = null;

  for (const post of posts) {
    const slug = post.slug ?? "(no slug)";
    if (!Array.isArray(post.body)) {
      bodiless += 1;
      continue;
    }
    const body = post.body as Body;

    const postItems = extractTranslatables(body);
    const roundTripped = applyTranslatables(body, toTexts(postItems));
    assert.strictEqual(
      JSON.stringify(roundTripped),
      JSON.stringify(body),
      `the identity round trip is NOT byte identical for post "${slug}" in dataset ${dataset}. Reassembly is touching something outside the enumerated slots on real data, which the synthetic fixture did not reach.`,
    );

    // Two independent computations, the second over a separate copy of the same data, so this
    // is determinism of the fingerprint over the document rather than a cached string compared
    // with itself. The gate compares source against translation, so it must be reproducible.
    const first = structuralFingerprint(body);
    const second = structuralFingerprint(structuredClone(body) as Body);
    assert.strictEqual(
      first,
      second,
      `structuralFingerprint is not stable across two computations for post "${slug}". A gate that is not deterministic would refuse writes at random.`,
    );

    totalSlots += postItems.length;
    totalBlocks += body.length;
    const chars = JSON.stringify(body).length;
    if (largest === null || chars > largest.chars) {
      largest = { slug, blocks: body.length, slots: postItems.length, chars };
    }
  }

  assert.strictEqual(
    bodiless,
    0,
    `${bodiless} approved English post(s) in dataset ${dataset} have no body array. An approved post with no body is either a data defect or a projection that changed shape.`,
  );
  assert.ok(largest, "no post with a body was measured, so the largest-post report would be empty");

  console.log(
    `  round trip: ${posts.length}/${posts.length} approved English post(s) byte identical, ${totalBlocks} block(s), ${totalSlots} translatable slot(s) total`,
  );
  console.log(
    `  largest post: slug="${largest.slug}" blocks=${largest.blocks} slots=${largest.slots} body=${largest.chars} chars`,
  );

  // Nothing above writes. Every statement in this section is a fetch, which is what lets it be
  // run against the production dataset as a routine gate rather than a supervised operation.
  console.log("translation.check.ts: ALL PASS");
}

// ── Post-run section: read-only, runs only under --post-run ──────────────────
//
// This is the mode that turns the phase's claims into assertions. Everything above proves the
// pure core is correct; this proves that what the pipeline actually wrote into the Content Lake
// matches its source, is a draft the publish cron structurally cannot act on, and was paid for
// on the books. It writes nothing and it is safe to run against production as a routine gate.

/** The literal `status` value api/cron/publish-scheduled matches on (D-12). */
//
// scripts/translate-posts.ts deliberately never contains this string, in code or in a comment,
// and an acceptance criterion greps that file for its absence. This file is the opposite case:
// it is the tripwire, and a tripwire has to name the thing it is watching for. The assertion
// below is permanent and is not specific to any one run.
const CRON_STATUS = "scheduled";

/** The `status` value a Farsi sibling must carry instead. */
const DRAFT_STATUS = "draft";

/** The two activities the pipeline books its spend under (D-16). */
const TRANSLATE_ACTIVITY = "translate-post";
const VERIFY_ACTIVITY = "translate-verify";

/**
 * Arabic-script Unicode blocks: Arabic, Arabic Supplement, Presentation Forms A and B.
 * Farsi is written in this script, so a string carrying none of it is either untranslated
 * English, a bare number, a URL, or code.
 */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** The anti-vacuity floor. Numbers, URLs and code legitimately stay Latin, so it is not 100. */
const ANTI_VACUITY_FLOOR = 0.8;

type SanityDoc = Record<string, unknown> & { _id: string; _type: string };

let assertions = 0;

function ok(condition: boolean, message: string): void {
  assertions += 1;
  assert.ok(condition, message);
}

function eq<T>(actual: T, expected: T, message: string): void {
  assertions += 1;
  assert.strictEqual(actual, expected, message);
}

function bodyOf(doc: SanityDoc, label: string): Body {
  const body: unknown = doc.body;
  assert.ok(
    Array.isArray(body),
    `${label} (${doc._id}) has no body array, so every structural assertion about it would be vacuous.`,
  );
  return body as Body;
}

/** Every `markDefs[].href` in the body, in document order. */
function hrefsOf(body: Body): string[] {
  const out: string[] = [];
  for (const node of body) {
    if (typeof node !== "object" || node === null) continue;
    const markDefs: unknown = (node as { markDefs?: unknown }).markDefs;
    if (!Array.isArray(markDefs)) continue;
    for (const def of markDefs) {
      if (typeof def !== "object" || def === null) continue;
      const href: unknown = (def as { href?: unknown }).href;
      if (typeof href === "string") out.push(href);
    }
  }
  return out;
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;
}

async function runPostRun(): Promise<void> {
  const { createClient } = await import("@sanity/client");

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
  // Same rule as the live section: no fallback dataset string, ever.
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";
  const slugArg = flagValue("--slug");

  assert.ok(
    projectId,
    "NEXT_PUBLIC_SANITY_PROJECT_ID is required for --post-run (use --env-file .env.local or --env-file .env.vercel-prod)",
  );
  assert.ok(dataset, "NEXT_PUBLIC_SANITY_DATASET is required for --post-run and has no default");

  // One client, configured raw, for the same reason the live section builds its own: a Farsi
  // sibling exists ONLY as a drafts.* document, and the default published perspective at this
  // apiVersion cannot see one at all. Read through the published perspective, every assertion
  // below would report "no sibling" forever, on a dataset full of correct siblings.
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "raw",
  });

  // Whole documents, not a projection: three of the assertions below are about keys being
  // ABSENT, and a projection cannot distinguish an absent key from one it did not ask for.
  const farsiDocs = await client.fetch<SanityDoc[]>(
    `*[_type == "post" && language == "fa"] | order(_id asc)`,
  );

  console.log(
    `post-run: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} (raw perspective) farsi-documents=${farsiDocs.length} slug=${slugArg ?? "(every Farsi document)"}`,
  );

  // ── Dataset-wide assertions, run regardless of --slug ───────────────────────

  // T-03-03, the critical one. api/cron/publish-scheduled is unfiltered by language (Phase 2
  // D-02): it patches every post carrying this status to approved and mails every subscriber
  // with an English subject line. Nothing in the schema prevents a Farsi document carrying it,
  // so this assertion is the data-layer tripwire and it stays here permanently.
  const cronStatusCount = await client.fetch<number>(
    `count(*[_type == "post" && language == "fa" && status == $cronStatus])`,
    { cronStatus: CRON_STATUS },
  );
  eq(
    cronStatusCount,
    0,
    `expected 0 Farsi document(s) carrying status "${CRON_STATUS}" in dataset ${dataset}, found ${cronStatusCount}. ` +
      `api/cron/publish-scheduled matches on that status without filtering by language, so each of those documents would be auto-approved and announced to every subscriber with an English subject line (D-12). ` +
      `Remedy: patch each one to "${DRAFT_STATUS}" immediately, then find what set it, because the pipeline never writes that value.`,
  );

  // Every Farsi document points at a source that exists.
  const refs = farsiDocs.map((doc) => {
    const translationOf: unknown = doc.translationOf;
    const ref =
      typeof translationOf === "object" && translationOf !== null
        ? (translationOf as { _ref?: unknown })._ref
        : undefined;
    return { id: doc._id, ref: typeof ref === "string" ? ref : null };
  });

  const resolvable = await client.fetch<string[]>(`*[_type == "post" && _id in $ids]._id`, {
    ids: refs.map((r) => r.ref).filter((r): r is string => r !== null),
  });
  const resolvableSet = new Set(resolvable);

  for (const { id, ref } of refs) {
    ok(
      ref !== null,
      `Farsi document ${id} has no translationOf._ref at all, so nothing connects it to an English source and the staleness and idempotence queries cannot see it. Remedy: set translationOf on it, or delete it if it was written by hand.`,
    );
    ok(
      ref === null || resolvableSet.has(ref),
      `Farsi document ${id} references translationOf._ref "${ref ?? ""}", which resolves to no post in dataset ${dataset}. Expected an existing English source. Remedy: the source was deleted or renamed; repoint or delete the sibling.`,
    );
  }

  // No two Farsi documents claim the same source. Two would mean the sibling-count subquery
  // sees a translated post as translated twice, and a reviewer sees two competing drafts.
  const seen = new Map<string, string>();
  for (const { id, ref } of refs) {
    if (ref === null) continue;
    const first = seen.get(ref);
    ok(
      first === undefined,
      `Farsi documents ${first ?? ""} and ${id} both reference translationOf._ref "${ref}". Expected at most one Farsi sibling per English source. Remedy: delete whichever draft is not the one a reviewer has been editing.`,
    );
    if (first === undefined) seen.set(ref, id);
  }

  // ── Build the (source, sibling) pairs to inspect ────────────────────────────

  type Pair = { slug: string; source: SanityDoc; sibling: SanityDoc };
  const pairs: Pair[] = [];

  if (slugArg !== null) {
    const source = await client.fetch<SanityDoc | null>(
      `*[_type == "post" && !(_id in path("drafts.**")) && ${EN_LANGUAGE} && slug.current == $slug][0]`,
      { slug: slugArg },
    );
    assert.ok(
      source,
      `--post-run --slug ${slugArg}: no published English post with that slug exists in dataset ${dataset}, so there is no source to compare a sibling against. Check the slug.`,
    );
    const sibling = farsiDocs.find((doc) => {
      const translationOf: unknown = doc.translationOf;
      const ref =
        typeof translationOf === "object" && translationOf !== null
          ? (translationOf as { _ref?: unknown })._ref
          : undefined;
      return ref === source._id;
    });
    assert.ok(
      sibling,
      `--post-run --slug ${slugArg}: the English source ${source._id} exists in dataset ${dataset} but it has NO Farsi sibling. ` +
        `Expected exactly one document with language "fa" and translationOf._ref == "${source._id}", found 0 among ${farsiDocs.length} Farsi document(s). ` +
        `Remedy: translate it first, with npx tsx --env-file <the same env file> scripts/translate-posts.ts --slug ${slugArg} --execute.`,
    );
    pairs.push({ slug: slugArg, source, sibling });
  } else {
    assert.ok(
      farsiDocs.length > 0,
      `--post-run: dataset ${dataset} carries 0 Farsi document(s), so there is no sibling to assert against and every per-document assertion would be vacuous. ` +
        `Expected at least one document with language "fa". Remedy: run the pipeline against this dataset first, or pass the env file of a dataset that has been translated.`,
    );
    const sources = await client.fetch<SanityDoc[]>(`*[_type == "post" && _id in $ids]`, {
      ids: refs.map((r) => r.ref).filter((r): r is string => r !== null),
    });
    const byId = new Map(sources.map((doc) => [doc._id, doc]));
    for (const sibling of farsiDocs) {
      const translationOf: unknown = sibling.translationOf;
      const ref =
        typeof translationOf === "object" && translationOf !== null
          ? (translationOf as { _ref?: unknown })._ref
          : undefined;
      const source = typeof ref === "string" ? byId.get(ref) : undefined;
      assert.ok(
        source,
        `--post-run: Farsi document ${sibling._id} has no resolvable English source, so it cannot be compared. This should already have failed the resolution assertion above.`,
      );
      const slugValue: unknown = (source.slug as { current?: unknown } | undefined)?.current;
      pairs.push({
        slug: typeof slugValue === "string" ? slugValue : "(no slug)",
        source,
        sibling,
      });
    }
  }

  // ── Per-pair assertions ────────────────────────────────────────────────────

  // Pin the two accepted translationNotes shapes to the formatter itself rather than to a
  // regex someone wrote from memory, so the two cannot drift apart.
  const CLEAN_NOTES = /^Verify pass clean \(\d{4}-\d{2}-\d{2}\)$/;
  const FINDINGS_NOTES = /^Verify pass \d{4}-\d{2}-\d{2}: \d+ finding\(s\)/;
  ok(
    CLEAN_NOTES.test(formatNotes([], "2026-01-01")),
    "the clean-line pattern below no longer matches what formatNotes actually renders for zero findings, so the assertion on real documents would be checking a shape nothing writes.",
  );
  ok(
    FINDINGS_NOTES.test(
      formatNotes(
        [{ category: "number", severity: "warn", location: "block[0]/span[0]", summary: "x" }],
        "2026-01-01",
      ),
    ),
    "the findings-header pattern below no longer matches what formatNotes actually renders, so the assertion on real documents would be checking a shape nothing writes.",
  );

  const EM_DASH_CHAR = String.fromCharCode(0x2014);

  /** Siblings whose source has moved on since they were translated. Reported, never a failure. */
  const staleSiblings: string[] = [];

  for (const { slug, source, sibling } of pairs) {
    const at = `"${slug}" (sibling ${sibling._id}, source ${source._id})`;

    ok(
      sibling._id.startsWith("drafts."),
      `${at}: the sibling _id does not begin with "drafts.", so it is a PUBLISHED Farsi document. Expected a draft. The drafts. prefix is the whole of what makes a Sanity document a draft, and D-14 says the pipeline only ever produces drafts for a human to publish. Remedy: unpublish it.`,
    );
    eq(
      sibling.language,
      "fa",
      `${at}: language is ${JSON.stringify(sibling.language)}, expected "fa".`,
    );
    eq(
      (sibling.translationOf as { _ref?: unknown } | undefined)?._ref,
      source._id,
      `${at}: translationOf._ref does not point at this source. Expected "${source._id}".`,
    );
    eq(
      sibling.status,
      DRAFT_STATUS,
      `${at}: status is ${JSON.stringify(sibling.status)}, expected "${DRAFT_STATUS}". Any other value risks the unfiltered publish cron (D-12).`,
    );
    eq(
      (sibling.slug as { current?: unknown } | undefined)?.current,
      (source.slug as { current?: unknown } | undefined)?.current,
      `${at}: slug.current differs from the source's. The design reuses the English slug verbatim, so /fa/<slug> and /<slug> are the same post at two addresses.`,
    );
    // The D-08 staleness anchor. It is deliberately NOT asserted equal to the source's
    // _updatedAt: a sibling whose source has since been edited is STALE, and stale is a state
    // the pipeline supports on purpose (it reports stale siblings and leaves them alone until
    // someone passes --retranslate). An equality assertion here would mean this check could
    // never be run as a routine gate on a live dataset, because the first time Saeid edited an
    // English post it would start failing. What must never happen is an anchor claiming a
    // source revision that does not exist yet.
    const anchor: unknown = sibling.sourceUpdatedAt;
    const sourceUpdatedAt = source._updatedAt;
    ok(
      typeof anchor === "string" && anchor.length > 0,
      `${at}: sourceUpdatedAt is ${JSON.stringify(anchor)}. Expected the source _updatedAt the translation was made from. Without it, D-08 cannot tell a fresh sibling from a stale one and the backlog would either never or always look stale.`,
    );
    ok(
      typeof anchor !== "string" ||
        typeof sourceUpdatedAt !== "string" ||
        anchor <= sourceUpdatedAt,
      `${at}: sourceUpdatedAt is ${JSON.stringify(anchor)}, which is LATER than the source's own _updatedAt ${JSON.stringify(sourceUpdatedAt)}. The anchor records the source revision the translation was made from, so it can equal the source or lag it, never lead it. A leading anchor means the sibling would never be reported stale again.`,
    );
    const stale = typeof anchor === "string" && anchor !== sourceUpdatedAt;
    if (stale) staleSiblings.push(`${slug} (anchor ${String(anchor)}, source ${String(sourceUpdatedAt)})`);

    const sourceBody = bodyOf(source, `${at} source`);
    const siblingBody = bodyOf(sibling, `${at} sibling`);

    eq(
      structuralFingerprint(siblingBody),
      structuralFingerprint(sourceBody),
      `${at}: the sibling body's structural fingerprint differs from its source's. Expected byte-identical structure with only the translatable slots changed. This is the D-05 tier 1 invariant, and a document that fails it here got past the run-time gate somehow. Remedy: delete the draft and re-run with --retranslate; do not hand-repair it.`,
    );

    // Deliberately duplicated with the fingerprint, which already covers hrefs: "every link
    // still works" is a named roadmap success criterion, and a criterion deserves an assertion
    // whose failure message says what actually broke rather than "the fingerprint moved".
    const sourceHrefs = hrefsOf(sourceBody);
    const siblingHrefs = hrefsOf(siblingBody);
    assertions += 1;
    assert.deepStrictEqual(
      siblingHrefs,
      sourceHrefs,
      `${at}: the ordered markDefs[].href list is not byte identical to the source's. Every link in the Farsi draft must point exactly where the English one does; a model that "localised" a URL leaves a dead link under Saeid's byline.\n  source:  ${JSON.stringify(sourceHrefs)}\n  sibling: ${JSON.stringify(siblingHrefs)}`,
    );

    // D-15: the two homepage curation keys are a Phase 4 decision. Omitted, never false.
    for (const key of ["featured", "heroOrder"] as const) {
      ok(
        !Object.hasOwn(sibling, key),
        `${at}: the sibling carries a "${key}" key. Expected the key to be absent entirely, not set to a falsy value: homepage curation for Farsi is a Phase 4 decision and an omitted key cannot accidentally claim it (D-15).`,
      );
    }

    const notes: unknown = sibling.translationNotes;
    ok(
      typeof notes === "string" && notes.length > 0,
      `${at}: translationNotes is ${JSON.stringify(notes)}. Expected a non-empty string. An empty field is ambiguous between "the verify pass found nothing" and "the verify pass never ran", and those mean opposite things to whoever decides to publish (D-06).`,
    );
    const notesText = typeof notes === "string" ? notes : "";
    ok(
      CLEAN_NOTES.test(notesText) || FINDINGS_NOTES.test(notesText),
      `${at}: translationNotes does not match either D-06 form. Expected "Verify pass clean (YYYY-MM-DD)" or a "Verify pass YYYY-MM-DD: N finding(s)" header. Got: ${JSON.stringify(notesText.split("\n")[0])}`,
    );
    ok(
      !notesText.includes(EM_DASH_CHAR),
      `${at}: translationNotes contains an em dash. The notes are English prose written for Saeid and never carry one.`,
    );

    // ── Anti-vacuity (T-03-30) ───────────────────────────────────────────────
    // Everything above is satisfied perfectly by a bug that copied the English straight
    // through: the structure would be identical because it IS the source. These two are the
    // only assertions in this file that look at the text rather than the shape.
    const sourceItems = extractTranslatables(sourceBody);
    const siblingItems = extractTranslatables(siblingBody);
    eq(
      siblingItems.length,
      sourceItems.length,
      `${at}: the sibling enumerates ${siblingItems.length} translatable slot(s) against the source's ${sourceItems.length}. The fingerprint should already have caught this.`,
    );

    const total = sourceItems.length;
    ok(total > 0, `${at}: the source enumerates 0 translatable slot(s), so both guards below would be vacuous.`);

    let changed = 0;
    let arabic = 0;
    const untouched: string[] = [];
    for (let i = 0; i < siblingItems.length; i += 1) {
      const before = sourceItems[i]?.text ?? "";
      const after = siblingItems[i]!.text;
      if (after !== before) changed += 1;
      else if (untouched.length < 5) untouched.push(`${siblingItems[i]!.label} ${JSON.stringify(after.slice(0, 60))}`);
      if (ARABIC_SCRIPT.test(after)) arabic += 1;
    }

    const changedPct = pct(changed, total);
    const arabicPct = pct(arabic, total);

    ok(
      changed >= total * ANTI_VACUITY_FLOOR,
      `${at}: only ${changed} of ${total} translatable string(s) (${changedPct}%) differ from the English source, below the ${ANTI_VACUITY_FLOOR * 100}% floor. A copy-through bug passes every structural assertion above, because a perfect copy has a perfect fingerprint. First untouched slots: ${untouched.join(" | ")}`,
    );
    ok(
      arabic >= total * ANTI_VACUITY_FLOOR,
      `${at}: only ${arabic} of ${total} translatable string(s) (${arabicPct}%) carry any Arabic-script character, below the ${ANTI_VACUITY_FLOOR * 100}% floor. Farsi is written in Arabic script; a body that is mostly Latin is mostly untranslated.`,
    );

    const kinds = siblingItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `  ${slug}: sibling=${sibling._id} items=${total} (span ${kinds.span ?? 0}, cell ${kinds.cell ?? 0}, alt ${kinds.alt ?? 0}, caption ${kinds.caption ?? 0}) changed=${changedPct}% arabic-script=${arabicPct}% hrefs=${siblingHrefs.length}${stale ? " STALE" : ""} notes=${JSON.stringify(notesText.split("\n")[0])}`,
    );
  }

  if (staleSiblings.length > 0) {
    console.log(
      `  stale, reported not failed: ${staleSiblings.length} sibling(s) whose English source has been edited since they were translated. D-08 reports these and leaves them alone; --retranslate is the only thing that rewrites one.`,
    );
    for (const entry of staleSiblings) console.log(`    ${entry}`);
  }

  // ── Spend (T-03-08, success criterion 5) ───────────────────────────────────

  if (!process.env.DATABASE_URL) {
    console.log(
      `  SKIPPED: the TokenUsage spend assertion, because DATABASE_URL is not defined in this environment. Nothing about recorded spend was checked, and this row is printed rather than passed silently so the omission is visible in the run log.`,
    );
  } else {
    const { prisma } = await import("../../src/lib/prisma");
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const rows = await prisma.tokenUsage.findMany({
        where: {
          activity: { in: [TRANSLATE_ACTIVITY, VERIFY_ACTIVITY] },
          createdAt: { gte: since },
        },
        select: { activity: true, model: true, inputTokens: true, outputTokens: true, totalTokens: true },
      });

      for (const activity of [TRANSLATE_ACTIVITY, VERIFY_ACTIVITY]) {
        const forActivity = rows.filter((row) => row.activity === activity);
        ok(
          forActivity.length > 0,
          `no TokenUsage row with activity "${activity}" was created in the last 24 hours. Expected at least one: the pipeline books one row per post per pass, and a run that spent tokens without a record is spend nobody can see (success criterion 5, D-16).`,
        );
        ok(
          forActivity.every((row) => row.totalTokens > 0),
          `at least one TokenUsage row with activity "${activity}" carries totalTokens of 0. Expected the CLI-reported counts; a zero row means the usage block was not parsed off the response.`,
        );
      }

      // The Prisma model carries inputTokens, outputTokens, totalTokens and createdAt, and no
      // money column at all, so "cost 0" is structural here rather than a value to compare
      // against. Recorded explicitly so a later reader does not think the cost check was
      // forgotten: there is nothing on the row that could be non-zero.
      const summarised = [TRANSLATE_ACTIVITY, VERIFY_ACTIVITY].map((activity) => {
        const forActivity = rows.filter((row) => row.activity === activity);
        const input = forActivity.reduce((sum, row) => sum + row.inputTokens, 0);
        const output = forActivity.reduce((sum, row) => sum + row.outputTokens, 0);
        return `${activity} ${forActivity.length} row(s) ${input} in / ${output} out`;
      });
      console.log(
        `  spend: ${summarised.join(", ")}, in the last 24h, at cost 0 because TokenUsage has no money column and the run is subscription-funded (D-16)`,
      );
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log(
    `post-run: ${assertions} assertion(s) over ${pairs.length} sibling(s) of ${farsiDocs.length} Farsi document(s) in ${dataset}, ${cronStatusCount} carrying the publish-cron status, all translationOf refs resolve and none is shared`,
  );
  console.log("translation.check.ts: ALL PASS");
}

if (wantsPostRun) {
  runPostRun().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
} else if (wantsLive) {
  runLive().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
