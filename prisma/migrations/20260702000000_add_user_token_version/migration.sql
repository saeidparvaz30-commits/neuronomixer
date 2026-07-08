-- Add tokenVersion for JWT session revocation (S4/S11).
-- Additive, non-breaking: existing rows default to 0.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
