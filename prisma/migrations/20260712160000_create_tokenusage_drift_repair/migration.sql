-- Drift repair: TokenUsage was added to schema.prisma without a migration,
-- so the production database never got the table and the admin token-usage
-- page has failed with P2021 since it shipped. Idempotent because the
-- preview database already has the table.
CREATE TABLE IF NOT EXISTS "TokenUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TokenUsage_userId_idx" ON "TokenUsage"("userId");
CREATE INDEX IF NOT EXISTS "TokenUsage_activity_idx" ON "TokenUsage"("activity");
CREATE INDEX IF NOT EXISTS "TokenUsage_createdAt_idx" ON "TokenUsage"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TokenUsage_userId_fkey') THEN
    ALTER TABLE "TokenUsage"
      ADD CONSTRAINT "TokenUsage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
