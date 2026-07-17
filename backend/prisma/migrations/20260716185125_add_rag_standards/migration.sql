-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "CodingStandard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardChunk" (
    "id" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandardChunk_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CodingStandard" ADD CONSTRAINT "CodingStandard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardChunk" ADD CONSTRAINT "StandardChunk_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "CodingStandard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "StandardChunk_standardId_idx" ON "StandardChunk"("standardId");

-- HNSW index for fast approximate nearest-neighbor search (cosine distance)
CREATE INDEX "StandardChunk_embedding_hnsw_idx" ON "StandardChunk" USING hnsw ("embedding" vector_cosine_ops);