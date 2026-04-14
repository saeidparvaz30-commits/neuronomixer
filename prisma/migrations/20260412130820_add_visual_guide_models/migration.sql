-- CreateEnum
CREATE TYPE "GuideVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "GuideCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "visibility" "GuideVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideUnit" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "visibility" "GuideVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualGuide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "interactiveType" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'Everyone',
    "order" INTEGER NOT NULL,
    "visibility" "GuideVisibility" NOT NULL DEFAULT 'DRAFT',
    "implemented" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "unitId" TEXT,
    "nextGuideSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuideCategory_slug_key" ON "GuideCategory"("slug");

-- CreateIndex
CREATE INDEX "GuideCategory_order_idx" ON "GuideCategory"("order");

-- CreateIndex
CREATE UNIQUE INDEX "GuideUnit_slug_key" ON "GuideUnit"("slug");

-- CreateIndex
CREATE INDEX "GuideUnit_categoryId_idx" ON "GuideUnit"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideUnit_categoryId_order_key" ON "GuideUnit"("categoryId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VisualGuide_slug_key" ON "VisualGuide"("slug");

-- CreateIndex
CREATE INDEX "VisualGuide_categoryId_idx" ON "VisualGuide"("categoryId");

-- CreateIndex
CREATE INDEX "VisualGuide_unitId_idx" ON "VisualGuide"("unitId");

-- CreateIndex
CREATE INDEX "VisualGuide_visibility_idx" ON "VisualGuide"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "VisualGuide_categoryId_order_key" ON "VisualGuide"("categoryId", "order");

-- AddForeignKey
ALTER TABLE "GuideCompletion" ADD CONSTRAINT "GuideCompletion_guideSlug_fkey" FOREIGN KEY ("guideSlug") REFERENCES "VisualGuide"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideUnit" ADD CONSTRAINT "GuideUnit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GuideCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualGuide" ADD CONSTRAINT "VisualGuide_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GuideCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualGuide" ADD CONSTRAINT "VisualGuide_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GuideUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
