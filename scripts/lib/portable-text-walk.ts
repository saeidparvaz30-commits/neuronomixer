/**
 * The Portable Text translation walker: the code that decides which strings in a post
 * body may be translated, and the only path by which a model's output gets put back.
 *
 * The trap this module exists to avoid: handing a whole `body[]` to a model as JSON and
 * asking for "the same JSON, in Farsi". Models renumber `_key` values, rewrite `markDefs`
 * hrefs, drop a `listItem`, merge two children into one and reorder object keys, all while
 * emitting text that reads perfectly well. By the time that lands in the Content Lake the
 * links are dead, the list has lost its numbering and there is nothing left to diff against.
 *
 * So the model never sees the document. Code enumerates the translatable slots (D-05 tier 1,
 * D-13), the model receives a flat `string[]`, and reassembly writes into those same slots
 * and nothing else. This module has no imports, no side effects on import, and no id
 * generation of any kind: a freshly minted key is itself a structural mutation, and the
 * fingerprint gate below would correctly refuse the write.
 */

/**
 * A span, exactly as measured across all 2,687 production spans: these four keys, no others.
 */
export type Span = {
  _key: string;
  _type: "span";
  marks: string[];
  text: string;
};

/** A table row. `cells` are plain strings, not spans, which is why they need their own rule. */
export type TableRow = {
  _key: string;
  _type: "tableRow";
  cells: string[];
};

/** `{ _key, _type: "table", rows: [{ _key, _type: "tableRow", cells: string[] }] }`. */
export type TableBlock = {
  _key: string;
  _type: "table";
  rows: TableRow[];
};

/**
 * An image block. Production carries `_key, _type, alignment, alt, asset, width`; the dev
 * dataset additionally carries `crop` and `hotspot`. Neither list is enforced here.
 */
export type ImageBlock = {
  _key: string;
  _type: "image";
  alignment?: string;
  alt?: string;
  asset?: { _ref?: string; _type?: string };
  width?: number;
  crop?: unknown;
  hotspot?: unknown;
};

/**
 * A body entry. A text block carries `_key, _type, children, level, listItem, markDefs, style`,
 * but the container is typed permissively on purpose: every field this module does not name
 * has to survive the round trip untouched, including fields no schema declares today.
 */
export type PortableTextBlock = {
  _type: string;
  [key: string]: unknown;
};

/** A post body: the `blockContent` array as it comes back from GROQ. */
export type Body = PortableTextBlock[];

/** One translatable slot. `label` is a stable location, derived only from array positions. */
export type Translatable = {
  text: string;
  kind: "span" | "alt" | "caption" | "cell";
  label: string;
};

/** What the single enumerator hands to its caller for each translatable slot. */
type Slot = {
  text: string;
  kind: Translatable["kind"];
  label: string;
  /** Writes back into the exact slot this visit came from. */
  set: (next: string) => void;
};

type Visit = (slot: Slot) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The ONE enumerator. Both `extractTranslatables` and `applyTranslatables` go through it,
 * and that is the central design constraint of this module rather than a tidiness choice:
 * two separate traversals can drift apart, and the day they disagree about which slots are
 * translatable is the day a translated string lands in the wrong place with no error.
 *
 * Visits in strict document order:
 *   1. `block`   -> each `children[]` entry with `_type === "span"` and non-empty `text`
 *   2. `image`   -> `alt` when non-empty
 *   3. `video`   -> `caption` when non-empty
 *   4. `table`   -> each `rows[].cells[]` entry that is a non-empty string
 *   5. anything else -> contributes nothing and is not recursed into
 *
 * Rule 5 is the D-13 boundary. It is also the reason the success criterion "code blocks pass
 * through untouched" holds: the corpus contains zero `code` blocks today (all 26 production
 * and 17 dev posts were enumerated), so there is deliberately no `code` branch here. The
 * absence is the guarantee, not an oversight. Any block type added to the content model later
 * is inert to this walker until someone adds a rule for it on purpose.
 */
function walkSlots(body: Body, visit: Visit): void {
  if (!Array.isArray(body)) return;

  for (let bi = 0; bi < body.length; bi += 1) {
    const node: unknown = body[bi];
    if (!isRecord(node)) continue;

    // 1. Text block: its span children, in array order.
    if (node._type === "block") {
      const children: unknown = node.children;
      if (!Array.isArray(children)) continue;
      for (let ci = 0; ci < children.length; ci += 1) {
        const child: unknown = children[ci];
        if (!isRecord(child)) continue;
        if (child._type !== "span") continue;
        const text: unknown = child.text;
        if (typeof text !== "string" || text === "") continue;
        visit({
          text,
          kind: "span",
          label: `block[${bi}]/span[${ci}]`,
          set: (next) => {
            child.text = next;
          },
        });
      }
      continue;
    }

    // 2. Image: alt text is reader-visible prose (a11y and SEO), 61 strings in production.
    if (node._type === "image") {
      const alt: unknown = node.alt;
      if (typeof alt === "string" && alt !== "") {
        visit({
          text: alt,
          kind: "alt",
          label: `image[${bi}]/alt`,
          set: (next) => {
            node.alt = next;
          },
        });
      }
      continue;
    }

    // 3. Video: the caption renders under the player.
    if (node._type === "video") {
      const caption: unknown = node.caption;
      if (typeof caption === "string" && caption !== "") {
        visit({
          text: caption,
          kind: "caption",
          label: `video[${bi}]/caption`,
          set: (next) => {
            node.caption = next;
          },
        });
      }
      continue;
    }

    // 4. Table: row order, then cell order. Cells are bare strings, so they are invisible to
    //    any walker that only looks at spans, and a Farsi post would ship an English table.
    if (node._type === "table") {
      const rows: unknown = node.rows;
      if (!Array.isArray(rows)) continue;
      for (let ri = 0; ri < rows.length; ri += 1) {
        const row: unknown = rows[ri];
        if (!isRecord(row)) continue;
        const cells: unknown = row.cells;
        if (!Array.isArray(cells)) continue;
        for (let ki = 0; ki < cells.length; ki += 1) {
          const cell: unknown = cells[ki];
          if (typeof cell !== "string" || cell === "") continue;
          visit({
            text: cell,
            kind: "cell",
            label: `table[${bi}]/row[${ri}]/cell[${ki}]`,
            set: (next) => {
              (cells as string[])[ki] = next;
            },
          });
        }
      }
      continue;
    }

    // 5. Unknown `_type`: nothing is translatable and nothing is recursed into.
  }
}

/**
 * Every translatable string in the body, in document order.
 *
 * The `label` is what the verify pass and `translationNotes` use for location context, so it
 * has to be deterministic: it is built purely from array positions, never from content.
 */
export function extractTranslatables(body: Body): Translatable[] {
  const out: Translatable[] = [];
  walkSlots(body, ({ text, kind, label }) => {
    out.push({ text, kind, label });
  });
  return out;
}

/** Flattens the enumeration to the bare `string[]` that is all the model ever receives. */
export function toTexts(items: readonly Translatable[]): string[] {
  return items.map((item) => item.text);
}

/**
 * Reassembles a body from translated strings, consuming them in enumeration order.
 *
 * The count check runs BEFORE anything is written, so a short or long response never produces
 * a half-translated body that someone could mistake for a partial success. Every `_key` is
 * reused verbatim from the source: this function assigns into enumerated slots and does
 * nothing else at all.
 */
export function applyTranslatables(body: Body, texts: readonly string[]): Body {
  const expected = extractTranslatables(body).length;
  if (expected !== texts.length) {
    throw new Error(
      `translatable count mismatch: the body enumerates ${expected} translatable string(s) but ${texts.length} were supplied. ` +
        `The response must carry exactly one string per enumerated slot, in the same order. Nothing was written.`,
    );
  }

  const clone = structuredClone(body) as Body;
  let consumed = 0;
  walkSlots(clone, ({ set }) => {
    set(texts[consumed] as string);
    consumed += 1;
  });

  // A tripwire on the deep copy, not on the caller: the clone must enumerate exactly what the
  // source enumerated, or the two walks disagreed about a body that did not change in between.
  if (consumed !== texts.length) {
    throw new Error(
      `translatable count mismatch after reassembly: consumed ${consumed} of ${texts.length} supplied string(s). ` +
        `The copied body enumerated a different number of slots than the source, which should be impossible.`,
    );
  }

  return clone;
}

/**
 * The blanking character, NUL, written as an escape so this source file stays plain text.
 * Nothing in the corpus contains it, so it can never collide with real prose.
 */
const BLANK = "\u0000";

/**
 * The D-05 tier 1 blocking gate: a canonical string of the body with every translatable slot
 * blanked. Source and translation must produce byte-identical fingerprints or the draft is
 * refused.
 *
 * Deriving this from the walker instead of from an independent replacer is deliberate. It
 * guarantees the gate blanks exactly the slots the walker owns, compares every other leaf
 * verbatim, and stays correct as the content model grows. An independent replacer can quietly
 * fall out of step with the walker, and a gate that is out of step with the thing it guards is
 * worse than no gate.
 *
 * Because reassembly copies the source and assigns only into enumerated slots, this should be
 * impossible to fail. That is the point: it is a tripwire on this module and the reassembly
 * path, not on the model. It costs nothing, and it is the difference between believing the
 * structure survived and having proved it before writing.
 */
export function structuralFingerprint(body: Body): string {
  return JSON.stringify(
    applyTranslatables(body, new Array<string>(extractTranslatables(body).length).fill(BLANK)),
  );
}
