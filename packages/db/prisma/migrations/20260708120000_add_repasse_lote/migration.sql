-- AlterTable
ALTER TABLE "Repasse" ADD COLUMN     "loteId" TEXT;

-- CreateIndex
CREATE INDEX "Repasse_loteId_idx" ON "Repasse"("loteId");
