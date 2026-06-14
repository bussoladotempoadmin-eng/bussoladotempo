-- AlterTable
ALTER TABLE "MembroEquipe" ADD COLUMN     "chefeId" TEXT;

-- CreateIndex
CREATE INDEX "MembroEquipe_chefeId_idx" ON "MembroEquipe"("chefeId");

-- AddForeignKey
ALTER TABLE "MembroEquipe" ADD CONSTRAINT "MembroEquipe_chefeId_fkey" FOREIGN KEY ("chefeId") REFERENCES "MembroEquipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
