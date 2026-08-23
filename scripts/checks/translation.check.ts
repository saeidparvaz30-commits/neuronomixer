/**
 * Correctness proof for the translation pipeline's pure core: the Portable Text walker
 * (scripts/lib/portable-text-walk.ts), the D-05 tier 1 structural fingerprint gate, the
 * translationNotes formatter (scripts/lib/translation-notes.ts), and the glossary loader and
 * its deterministic prompt block (scripts/lib/glossary.ts).
 * Run: npx tsx scripts/checks/translation.check.ts | live: npx tsx --env-file .env.local scripts/checks/translation.check.ts --live
 * The offline section needs no env, no network and no model. Only --live touches the Content Lake, read-only.
 * --post-run is reserved for plan 03-09 (assertions against a Farsi draft the pipeline wrote) and is not implemented yet.
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

if (wantsPostRun) {
  // The flag name is reserved here so its meaning is fixed before anything depends on it.
  // Plan 03-09 fills it in: assertions against a Farsi draft the pipeline actually wrote
  // (fingerprint identical to its source, every markDefs href byte identical, translationNotes
  // present and in the D-06 shape, TokenUsage rows recorded, and zero fa + scheduled documents).
  console.error(
    "translation.check.ts: --post-run is not implemented until plan 03-09. It needs a Farsi draft to assert against, and no Farsi document exists yet.",
  );
  process.exit(1);
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

if (!wantsLive) {
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

if (wantsLive) {
  runLive().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
