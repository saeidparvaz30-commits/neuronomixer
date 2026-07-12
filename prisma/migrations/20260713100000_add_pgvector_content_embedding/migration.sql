-- Phase 5: pgvector semantic-search index (derived, rebuildable).
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE "ContentEmbedding" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" extensions.vector(768) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentEmbedding_sourceType_sourceId_chunkIndex_key"
    ON "ContentEmbedding"("sourceType", "sourceId", "chunkIndex");
CREATE INDEX "ContentEmbedding_sourceType_idx" ON "ContentEmbedding"("sourceType");
CREATE INDEX "ContentEmbedding_embedding_idx"
    ON "ContentEmbedding" USING hnsw ("embedding" extensions.vector_cosine_ops);
