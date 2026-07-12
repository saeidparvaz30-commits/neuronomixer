-- S6: replace plaintext API keys with SHA-256 hashes, in place.
-- Existing keys keep working: clients still send the plaintext key,
-- the app hashes it before lookup.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE "AuthorApiKey" ADD COLUMN "keyHash" TEXT;
ALTER TABLE "AuthorApiKey" ADD COLUMN "keyHint" TEXT;

UPDATE "AuthorApiKey"
SET "keyHash" = encode(extensions.digest("key", 'sha256'), 'hex'),
    "keyHint" = left("key", 9);

ALTER TABLE "AuthorApiKey" ALTER COLUMN "keyHash" SET NOT NULL;
ALTER TABLE "AuthorApiKey" ALTER COLUMN "keyHint" SET NOT NULL;

DROP INDEX "AuthorApiKey_key_key";
ALTER TABLE "AuthorApiKey" DROP COLUMN "key";

CREATE UNIQUE INDEX "AuthorApiKey_keyHash_key" ON "AuthorApiKey"("keyHash");
