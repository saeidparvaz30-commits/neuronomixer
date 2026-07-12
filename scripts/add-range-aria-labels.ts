/**
 * Phase 6 a11y sweep: ensure every <input type="range"> under VisualGuides has
 * an accessible name. Adds aria-label ONLY when the input has no aria-label,
 * no aria-labelledby, and no id (an id implies an associated <label htmlFor>,
 * the other established convention in this codebase).
 *
 * Label text is derived from the guide folder name so duplicates within a file
 * get a numeric suffix. Idempotent: re-running makes no further changes.
 *
 * Tag boundaries are found with a brace/string-aware scanner rather than a flat
 * regex, because these JSX <input> tags span multiple lines and contain `>`
 * characters inside arrow functions (onChange={(e) => ...}) and JSX
 * expressions. A `[^>]*` regex stops at the first such `>`, which would hide an
 * aria-label that appears later in the tag and cause a duplicate attribute.
 *
 * Usage:  npx tsx scripts/add-range-aria-labels.ts           (apply)
 *         npx tsx scripts/add-range-aria-labels.ts --check    (report only)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = "src/components/VisualGuides";
const CHECK = process.argv.includes("--check");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function humanise(folder: string): string {
  // Split CamelCase / digits into words, lower-case the tail.
  const spaced = folder.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Return the [start, endExclusive) span of the full opening <input ...> tag
 * beginning at index `start` (which must point at "<input"). Treats `>` as the
 * tag terminator only when it is not inside a string or a JSX `{...}`
 * expression, so arrow functions and `{a > b}` do not end the tag early.
 */
function inputTagEnd(src: string, start: number): number {
  let depth = 0;
  let quote = "";
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
    } else if (c === ">" && depth === 0) {
      return i + 1;
    }
  }
  return src.length;
}

const INPUT_START_RE = /<input\b/g;

let filesChanged = 0;
let tagsLabelled = 0;
const stillManual: string[] = [];

for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  // Guide folder = the segment right under VisualGuides.
  const parts = file.replace(/\\/g, "/").split("/");
  const guide = parts[parts.indexOf("VisualGuides") + 1] ?? "control";
  const baseLabel = `${humanise(guide)} control`;

  // Collect edits first, then apply from the end so indices stay valid.
  const edits: { at: number; text: string }[] = [];
  let perFile = 0;

  INPUT_START_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INPUT_START_RE.exec(src)) !== null) {
    const start = m.index;
    const end = inputTagEnd(src, start);
    const tag = src.slice(start, end);
    if (!/\btype\s*=\s*["']range["']/.test(tag)) continue; // only range inputs
    const hasName =
      /\baria-label\s*=/.test(tag) ||
      /\baria-labelledby\s*=/.test(tag) ||
      /\bid\s*=/.test(tag);
    if (hasName) continue;
    perFile += 1;
    tagsLabelled += 1;
    const label = perFile === 1 ? baseLabel : `${baseLabel} ${perFile}`;
    // Insert aria-label right after "<input" (start + "<input".length === start + 6).
    edits.push({ at: start + 6, text: ` aria-label="${label}"` });
  }

  if (edits.length) {
    stillManual.push(`${file}: +${perFile}`);
    if (!CHECK) {
      let next = src;
      for (const e of edits.reverse()) {
        next = next.slice(0, e.at) + e.text + next.slice(e.at);
      }
      writeFileSync(file, next);
    }
    filesChanged += 1;
  }
}

console.log(`${CHECK ? "[check] " : ""}files needing labels: ${filesChanged}, tags labelled: ${tagsLabelled}`);
if (CHECK && stillManual.length) console.log(stillManual.join("\n"));
