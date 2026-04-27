-- CreateEnum
CREATE TYPE "PrizeType" AS ENUM ('PER_PAGE', 'COMPLETION');

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "photosPerPage" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "collection_prizes" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "type" "PrizeType" NOT NULL,
    "pageNumber" INTEGER,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_prizes_collectionId_idx" ON "collection_prizes"("collectionId");

-- AddForeignKey
ALTER TABLE "collection_prizes" ADD CONSTRAINT "collection_prizes_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
