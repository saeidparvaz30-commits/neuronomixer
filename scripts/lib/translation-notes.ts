/**
 * The single rendering of verify-pass findings into a post's `translationNotes` field.
 *
 * `translationNotes` is `type: "text", rows: 6, readOnly: true` on `postType`, so what lands
 * here is plain text in a small Studio box that a reviewer scans in a couple of seconds. That
 * constrains the format more than it looks: one line per finding, the important ones first,
 * and never a wrapped paragraph that pushes the rest out of view.
 *
 * The trap being avoided is an empty field (D-06). A blank `translationNotes` is ambiguous
 * between "the verify pass found nothing" and "the verify pass never ran", and those two
 * mean opposite things to someone deciding whether to publish. So a clean pass writes an
 * explicit line with its date rather than writing nothing.
 *
 * The findings themselves never block a draft: structural integrity is code's job (D-05 tier 1),
 * and everything here is tier 2 prose drift for a human to judge.
 *
 * All output of this module is English prose for Saeid, so it carries no em dash anywhere.
 * That rule stops at this boundary: it says nothing about the Farsi body text the pipeline
 * writes into the document.
 */

/**
 * One verify-pass finding.
 *
 * The `category` union is the same one the verify pass JSON schema enumerates in its
 * `output_config.format`. Plan 03-08 must import this type rather than redeclare the list,
 * or the schema and the renderer can drift into disagreeing about what a finding can be.
 */
export type Finding = {
  category:
    | "number"
    | "date"
    | "url"
    | "entity-name"
    | "code-content"
    | "glossary-adherence"
    | "untranslated-leftover";
  severity: "info" | "warn";
  location: string;
  summary: string;
};

/** `warn` first. Anything a reviewer might have to act on has to be above the fold. */
const SEVERITY_RANK: Readonly<Record<Finding["severity"], number>> = {
  warn: 0,
  info: 1,
};

/**
 * Defensive one-lining. A model summary that arrives with a newline or a tab in it would
 * otherwise silently break the one-line-per-finding contract that makes the field scannable,
 * and the damage would only be visible in the Studio, after the draft was written.
 */
function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Renders findings into the exact text written to `translationNotes` (D-06).
 *
 * With no findings the result is a single explicit line, never an empty string. With findings
 * it is a header carrying the date and the count, then one line per finding, warnings first
 * and otherwise in the order the verify pass reported them.
 */
export function formatNotes(findings: readonly Finding[], date: string): string {
  if (findings.length === 0) return `Verify pass clean (${date})`;

  // Copied before sorting: the caller's array is the verify pass result and may be recorded
  // elsewhere. Array.prototype.sort is stable, so equal severities keep the model's order.
  const ordered = [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  return [
    `Verify pass ${date}: ${findings.length} finding(s)`,
    ...ordered.map((f) => `${f.category}: ${oneLine(f.summary)} (${oneLine(f.location)})`),
  ].join("\n");
}

/**
 * The date every caller stamps notes with, in one place so no two call sites invent
 * competing formats. UTC `YYYY-MM-DD`, which is what the D-06 lines show.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
