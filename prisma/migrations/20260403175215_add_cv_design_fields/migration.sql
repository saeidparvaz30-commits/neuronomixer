-- AlterTable
ALTER TABLE "AuthorCV" ADD COLUMN     "designGenerationsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "designHistory" JSONB NOT NULL DEFAULT '[]';
