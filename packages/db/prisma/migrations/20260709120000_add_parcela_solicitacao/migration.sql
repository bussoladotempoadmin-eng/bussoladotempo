-- CreateTable
CREATE TABLE "ParcelaSolicitacao" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "repasseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcelaSolicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParcelaSolicitacao_acaoId_idx" ON "ParcelaSolicitacao"("acaoId");

-- CreateIndex
CREATE INDEX "ParcelaSolicitacao_repasseId_idx" ON "ParcelaSolicitacao"("repasseId");

-- CreateIndex
CREATE INDEX "ParcelaSolicitacao_data_idx" ON "ParcelaSolicitacao"("data");

-- AddForeignKey
ALTER TABLE "ParcelaSolicitacao" ADD CONSTRAINT "ParcelaSolicitacao_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "AcaoComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelaSolicitacao" ADD CONSTRAINT "ParcelaSolicitacao_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: 1 parcela "à vista" por ação com valor solicitado. Data = início do
-- evento; preserva o vínculo de repasse já existente (mantém a trava atual).
INSERT INTO "ParcelaSolicitacao" ("id", "acaoId", "valor", "data", "repasseId", "createdAt")
SELECT gen_random_uuid()::text, "id", "valorSolicitado", "dataInicio", "repasseId", now()
FROM "AcaoComercial"
WHERE "valorSolicitado" IS NOT NULL AND "valorSolicitado" > 0;
