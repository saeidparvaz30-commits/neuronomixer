import {
  CANONICAL_PATH,
  PATH_LENGTH,
  Strictness,
  TokenKind,
  VALUE_POSITIONS,
  VOCAB,
} from "./types";

/**
 * The JSON grammar for the target schema, expressed as a positional state
 * machine over CANONICAL_PATH. State = position. Structural positions accept
 * exactly one token; the three value slots accept a set that depends on
 * schema strictness. Every legality check, mask, and analytic rate in this
 * guide derives from allowedTokenIds().
 */

const JSON_VALUE_KINDS: readonly TokenKind[] = ["str", "key", "other"];
const STRING_KINDS: readonly TokenKind[] = ["str", "key"];

const STRICT_ENUMS: Record<number, readonly string[]> = {
  3: ["get_weather"],
  10: ["oslo", "bergen", "paris"],
  14: ["unit-c", "unit-f"],
};

const allowedCache = new Map<string, readonly string[]>();

export function allowedTokenIds(pos: number, strictness: Strictness): readonly string[] {
  const key = `${strictness}:${pos}`;
  const cached = allowedCache.get(key);
  if (cached) return cached;

  let result: readonly string[];
  if (!VALUE_POSITIONS.includes(pos)) {
    result = [CANONICAL_PATH[pos]];
  } else if (strictness === "loose") {
    result = VOCAB.filter((t) => JSON_VALUE_KINDS.includes(t.kind)).map((t) => t.id);
  } else if (strictness === "typed") {
    result = VOCAB.filter((t) => STRING_KINDS.includes(t.kind)).map((t) => t.id);
  } else {
    result = STRICT_ENUMS[pos];
  }
  allowedCache.set(key, result);
  return result;
}

export function isLegalToken(pos: number, tokenId: string, strictness: Strictness): boolean {
  return allowedTokenIds(pos, strictness).includes(tokenId);
}

/**
 * Returns the first position where the sequence breaks the grammar, or null
 * if every token is legal and the sequence has the full length.
 */
export function firstIllegalPosition(
  ids: readonly string[],
  strictness: Strictness
): number | null {
  for (let pos = 0; pos < Math.min(ids.length, PATH_LENGTH); pos++) {
    if (!isLegalToken(pos, ids[pos], strictness)) return pos;
  }
  if (ids.length !== PATH_LENGTH) return Math.min(ids.length, PATH_LENGTH);
  return null;
}

export function isValidSequence(ids: readonly string[], strictness: Strictness): boolean {
  return firstIllegalPosition(ids, strictness) === null;
}

export type Outcome = "valid-correct" | "valid-wrong" | "invalid";

/**
 * Semantically correct = grammar-valid AND every value slot carries the
 * intended token (the canonical path token at that position).
 */
export function classifySequence(ids: readonly string[], strictness: Strictness): Outcome {
  if (!isValidSequence(ids, strictness)) return "invalid";
  const allIntended = VALUE_POSITIONS.every((pos) => ids[pos] === CANONICAL_PATH[pos]);
  return allIntended ? "valid-correct" : "valid-wrong";
}
