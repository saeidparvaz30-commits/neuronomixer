-- CreateTable
CREATE TABLE "GuideCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guideSlug" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideCompletion_userId_idx" ON "GuideCompletion"("userId");

-- CreateIndex
CREATE INDEX "GuideCompletion_guideSlug_idx" ON "GuideCompletion"("guideSlug");

-- CreateIndex
CREATE UNIQUE INDEX "GuideCompletion_userId_guideSlug_key" ON "GuideCompletion"("userId", "guideSlug");

-- AddForeignKey
ALTER TABLE "GuideCompletion" ADD CONSTRAINT "GuideCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
