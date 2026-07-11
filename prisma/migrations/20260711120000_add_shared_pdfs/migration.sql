-- CreateEnum
CREATE TYPE "SharedPdfEventType" AS ENUM ('VIEW', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "SharedPdf" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedPdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedPdfEvent" (
    "id" TEXT NOT NULL,
    "sharedPdfId" TEXT NOT NULL,
    "type" "SharedPdfEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedPdfEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedPdf_token_key" ON "SharedPdf"("token");

-- CreateIndex
CREATE INDEX "SharedPdfEvent_sharedPdfId_idx" ON "SharedPdfEvent"("sharedPdfId");

-- CreateIndex
CREATE INDEX "SharedPdfEvent_at_idx" ON "SharedPdfEvent"("at");

-- AddForeignKey
ALTER TABLE "SharedPdfEvent" ADD CONSTRAINT "SharedPdfEvent_sharedPdfId_fkey" FOREIGN KEY ("sharedPdfId") REFERENCES "SharedPdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;
