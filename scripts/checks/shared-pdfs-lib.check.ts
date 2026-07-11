/**
 * Logic checks for src/lib/sharedPdfs.ts. Run: npx tsx scripts/checks/shared-pdfs-lib.check.ts
 * DB-free: only pure helpers are checked here; getActiveShare is exercised in manual verification.
 */
import assert from "node:assert";
import { generateShareToken, slugifyFilename } from "../../src/lib/sharedPdfs";

// Token: 22 chars, base64url alphabet, unique across draws
const tokens = new Set(Array.from({ length: 1000 }, () => generateShareToken()));
for (const t of tokens) {
  assert.strictEqual(t.length, 22, `token length ${t.length}`);
  assert.match(t, /^[A-Za-z0-9_-]+$/, `token alphabet: ${t}`);
}
assert.strictEqual(tokens.size, 1000, "tokens must not collide in 1000 draws");

// Filename slug
assert.strictEqual(slugifyFilename("Immigration Guide 2026"), "immigration-guide-2026");
assert.strictEqual(slugifyFilename("  Visa / UDI: steps!  "), "visa-udi-steps");
assert.strictEqual(slugifyFilename("راهنمای مهاجرت"), "document", "non-ASCII-only titles fall back");
assert.strictEqual(slugifyFilename(""), "document");

console.log("shared-pdfs-lib.check.ts: ALL PASS");
