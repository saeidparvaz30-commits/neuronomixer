export type Strictness = "loose" | "typed" | "strict";

export type TokenKind = "struct" | "key" | "str" | "other" | "noise" | "end";

export interface Token {
  id: string;
  text: string;
  kind: TokenKind;
}

/**
 * The full token vocabulary of the simulated generator. Constant literal data:
 * identical on server and client, no randomness anywhere in module scope.
 */
export const VOCAB: readonly Token[] = [
  { id: "lbrace", text: "{", kind: "struct" },
  { id: "rbrace", text: "}", kind: "struct" },
  { id: "colon", text: ":", kind: "struct" },
  { id: "comma", text: ",", kind: "struct" },
  { id: "key-tool", text: '"tool"', kind: "key" },
  { id: "key-args", text: '"args"', kind: "key" },
  { id: "key-city", text: '"city"', kind: "key" },
  { id: "key-units", text: '"units"', kind: "key" },
  { id: "get_weather", text: '"get_weather"', kind: "str" },
  { id: "get_stock", text: '"get_stock"', kind: "str" },
  { id: "oslo", text: '"Oslo"', kind: "str" },
  { id: "bergen", text: '"Bergen"', kind: "str" },
  { id: "paris", text: '"Paris"', kind: "str" },
  { id: "unit-c", text: '"c"', kind: "str" },
  { id: "unit-f", text: '"f"', kind: "str" },
  { id: "sunny", text: '"sunny"', kind: "str" },
  { id: "num-72", text: "72", kind: "other" },
  { id: "null", text: "null", kind: "other" },
  { id: "true", text: "true", kind: "other" },
  { id: "noise-sure", text: "Sure!", kind: "noise" },
  { id: "noise-here", text: "here", kind: "noise" },
  { id: "noise-is", text: "is", kind: "noise" },
  { id: "noise-json", text: "JSON", kind: "noise" },
  { id: "end", text: "<end>", kind: "end" },
];

export const VOCAB_SIZE = VOCAB.length;

const TOKEN_BY_ID = new Map<string, Token>(VOCAB.map((t) => [t.id, t]));

export function tokenById(id: string): Token {
  const t = TOKEN_BY_ID.get(id);
  if (!t) throw new Error(`Unknown token id: ${id}`);
  return t;
}

/**
 * The intended emission: the token path that spells the correct tool call
 *   { "tool": "get_weather", "args": { "city": "Oslo", "units": "c" } }
 * followed by the end-of-sequence token. Position in this array is the
 * grammar state.
 */
export const CANONICAL_PATH: readonly string[] = [
  "lbrace",
  "key-tool",
  "colon",
  "get_weather",
  "comma",
  "key-args",
  "colon",
  "lbrace",
  "key-city",
  "colon",
  "oslo",
  "comma",
  "key-units",
  "colon",
  "unit-c",
  "rbrace",
  "rbrace",
  "end",
];

export const PATH_LENGTH = CANONICAL_PATH.length;

/** Positions in the canonical path where the schema has a value slot. */
export const VALUE_POSITIONS: readonly number[] = [3, 10, 14];

export interface StrictnessMeta {
  label: string;
  description: string;
}

export const STRICTNESS_META: Record<Strictness, StrictnessMeta> = {
  loose: {
    label: "Loose",
    description:
      "Value slots accept any JSON value token: strings, numbers, null, true. The envelope shape is still enforced.",
  },
  typed: {
    label: "Typed",
    description:
      "Value slots must be strings. Numbers, null, and true are rejected, but any string passes.",
  },
  strict: {
    label: "Strict enums",
    description:
      "Each value slot has an enum: tool must be get_weather, city one of three known cities, units c or f.",
  },
};

export const ALL_STRICTNESS: readonly Strictness[] = ["loose", "typed", "strict"];

/** Number of generations per batch run. */
export const BATCH_SIZE = 500;

/** The settings a sample or batch was run with, kept alongside its result. */
export interface RunSettings {
  errorRatePct: number;
  strictness: Strictness;
  constrained: boolean;
}

/**
 * Outcome palette tokens (spec token table). Applied AI category color
 * #ec4899 marks the valid-but-wrong failure class throughout this guide.
 * Never scatter these hexes; import from here.
 */
export const OUTCOME_COLORS = {
  validCorrect: "var(--color-success)",
  validWrong: "#ec4899",
  invalid: "#ef4444",
} as const;

export const COLOR_CODE_BLUE = "#93c5fd";
