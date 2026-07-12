import { createHash } from "crypto";

/** SHA-256 hex of an API key. Matches the pgcrypto digest used in the S6 migration. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
