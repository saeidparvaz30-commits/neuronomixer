// Pure text-as-data pipeline: tokenize, normalize, count.
// Every number displayed in this guide is computed by these functions,
// live in the browser, from the text visible in the input boxes.

export interface RawToken {
  /** Exact substring of the source text. */
  text: string;
  /** Start index in the source text (inclusive). */
  start: number;
  /** End index in the source text (exclusive). */
  end: number;
}

export interface PipelineOptions {
  lowercase: boolean;
  stopwords: boolean;
  stem: boolean;
}

export interface PipelineToken {
  raw: RawToken;
  /** Final form after the enabled stages; null if removed by the stop list. */
  final: string | null;
  /** True if the lowercase stage actually changed this token. */
  lowercased: boolean;
  /** True if the stemming stage actually changed this token. */
  stemmed: boolean;
}

export interface WordCount {
  word: string;
  count: number;
}

export interface OverlapStats {
  shared: string[];
  onlyA: string[];
  onlyB: string[];
  union: number;
  /** |A intersect B| / |A union B|; 0 when both vocabularies are empty. */
  jaccard: number;
}

/**
 * Word tokens: maximal runs of letters and digits, optionally joined by one
 * internal apostrophe (so "don't" is one token). Everything else
 * (whitespace, punctuation, symbols) is discarded by the tokenizer.
 */
const TOKEN_RE = /[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g;

export function tokenize(text: string): RawToken[] {
  const out: RawToken[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * A small, deliberately visible stop list of very common English function
 * words. Real projects tune this list per task; this one exists so the
 * removal step has honest, inspectable data behind it.
 * Matching is exact against the token's current form, so with lowercasing
 * OFF the token "The" does NOT match the entry "the". That is a real
 * pipeline-ordering lesson, not a bug.
 */
export const STOP_WORDS: readonly string[] = [
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at",
  "by", "for", "with", "from", "as", "is", "are", "was", "were", "be",
  "been", "am", "it", "its", "this", "that", "these", "those", "i", "you",
  "he", "she", "we", "they", "them", "his", "her", "their", "my", "your",
  "our", "not", "no", "so", "do", "did", "does", "have", "has", "had",
  "will", "would", "can", "could", "than", "then", "there", "here", "what",
  "when", "who", "how", "all", "some", "such", "very", "just", "also",
  "into", "over", "about", "again",
];

const STOP_SET: ReadonlySet<string> = new Set(STOP_WORDS);

const VOWEL_RE = /[aeiouy]/;

/** Drop one letter of a doubled final consonant (running -> runn -> run). */
function undouble(stem: string): string {
  const n = stem.length;
  if (n >= 3) {
    const a = stem[n - 2].toLowerCase();
    const b = stem[n - 1].toLowerCase();
    if (a === b && !"aeiou".includes(b) && b !== "l" && b !== "s") {
      return stem.slice(0, -1);
    }
  }
  return stem;
}

/**
 * A crude rule-based stemmer: a handful of suffix-stripping rules with
 * simple guards. It is honestly crude. It is NOT the Porter stemmer and
 * it will mangle some words (making -> mak). The point of showing it is
 * that even rough suffix rules visibly merge counts.
 * First matching rule wins.
 */
export function crudeStem(word: string): { stem: string; changed: boolean } {
  const lower = word.toLowerCase();
  const keep = (n: number) => word.slice(0, word.length - n);

  // studies -> study, cities -> city
  if (lower.endsWith("ies") && lower.length >= 5) {
    return { stem: keep(3) + "y", changed: true };
  }
  // classes -> class
  if (lower.endsWith("sses") && lower.length >= 5) {
    return { stem: keep(2), changed: true };
  }
  // counting -> count, running -> run (guard: a vowel must remain)
  if (
    lower.endsWith("ing") &&
    lower.length >= 6 &&
    VOWEL_RE.test(lower.slice(0, -3))
  ) {
    return { stem: undouble(keep(3)), changed: true };
  }
  // counted -> count, stopped -> stop (guard: a vowel must remain)
  if (
    lower.endsWith("ed") &&
    lower.length >= 5 &&
    VOWEL_RE.test(lower.slice(0, -2))
  ) {
    return { stem: undouble(keep(2)), changed: true };
  }
  // boxes -> box, watches -> watch
  if (/(?:s|x|z|ch|sh)es$/.test(lower) && lower.length >= 5) {
    return { stem: keep(2), changed: true };
  }
  // words -> word (guards: keep glass, bus, this)
  if (
    lower.endsWith("s") &&
    !lower.endsWith("ss") &&
    !lower.endsWith("us") &&
    !lower.endsWith("is") &&
    lower.length >= 4
  ) {
    return { stem: keep(1), changed: true };
  }
  return { stem: word, changed: false };
}

/**
 * Runs the enabled stages over the raw tokens, in this fixed order:
 * lowercase, then stop-word removal, then stemming.
 */
export function runPipeline(
  tokens: readonly RawToken[],
  opts: PipelineOptions
): PipelineToken[] {
  return tokens.map((raw) => {
    let form = raw.text;
    let lowercased = false;
    if (opts.lowercase) {
      const lower = form.toLowerCase();
      lowercased = lower !== form;
      form = lower;
    }
    if (opts.stopwords && STOP_SET.has(form)) {
      return { raw, final: null, lowercased, stemmed: false };
    }
    let stemmed = false;
    if (opts.stem) {
      const r = crudeStem(form);
      stemmed = r.changed;
      form = r.stem;
    }
    return { raw, final: form, lowercased, stemmed };
  });
}

/** Bag-of-words counts over the kept tokens, most frequent first. */
export function countWords(tokens: readonly PipelineToken[]): WordCount[] {
  const m = new Map<string, number>();
  for (const t of tokens) {
    if (t.final === null) continue;
    m.set(t.final, (m.get(t.final) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/** The set of distinct kept forms (the vocabulary). */
export function vocabulary(tokens: readonly PipelineToken[]): Set<string> {
  const s = new Set<string>();
  for (const t of tokens) {
    if (t.final !== null) s.add(t.final);
  }
  return s;
}

/** Jaccard overlap between two vocabularies, with the sets behind it. */
export function overlapStats(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>
): OverlapStats {
  const shared: string[] = [];
  const onlyA: string[] = [];
  for (const w of a) {
    if (b.has(w)) shared.push(w);
    else onlyA.push(w);
  }
  const onlyB: string[] = [];
  for (const w of b) {
    if (!a.has(w)) onlyB.push(w);
  }
  shared.sort();
  onlyA.sort();
  onlyB.sort();
  const union = shared.length + onlyA.length + onlyB.length;
  return {
    shared,
    onlyA,
    onlyB,
    union,
    jaccard: union === 0 ? 0 : shared.length / union,
  };
}
