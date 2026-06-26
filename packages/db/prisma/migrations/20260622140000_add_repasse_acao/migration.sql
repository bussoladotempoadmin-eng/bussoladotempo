-- AlterTable
ALTER TABLE "AcaoComercial" ADD COLUMN     "repasseId" TEXT;

-- CreateIndex
CREATE INDEX "AcaoComercial_repasseId_idx" ON "AcaoComercial"("repasseId");

-- AddForeignKey
ALTER TABLE "AcaoComercial" ADD CONSTRAINT "AcaoComercial_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
