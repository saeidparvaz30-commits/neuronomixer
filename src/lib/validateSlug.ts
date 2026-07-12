/**
 * Format validators for client-supplied identifiers on engagement endpoints.
 * Presence-only checks let arbitrary strings be persisted; these bound the shape.
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const SANITY_ID_RE = /^[a-zA-Z0-9._-]{1,100}$/;

export function isValidSlug(s: unknown): s is string {
  return typeof s === "string" && s.length > 0 && s.length <= 200 && SLUG_RE.test(s);
}

export function isValidSanityId(s: unknown): s is string {
  return typeof s === "string" && SANITY_ID_RE.test(s);
}

export function isValidFollowType(s: unknown): s is "author" | "category" {
  return s === "author" || s === "category";
}
