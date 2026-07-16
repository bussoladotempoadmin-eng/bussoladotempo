-- CreateTable
CREATE TABLE "PagamentoRepasse" (
    "id" TEXT NOT NULL,
    "repasseId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoRepasse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagamentoRepasse_repasseId_idx" ON "PagamentoRepasse"("repasseId");

-- DropIndex (repasseId deixa de ser único no caixa: 1 repasse pode ter N parcelas)
DROP INDEX "LancamentoCaixa_repasseId_key";

-- AlterTable
ALTER TABLE "LancamentoCaixa" ADD COLUMN     "pagamentoRepasseId" TEXT;

-- CreateIndex
CREATE INDEX "LancamentoCaixa_repasseId_idx" ON "LancamentoCaixa"("repasseId");

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoCaixa_pagamentoRepasseId_key" ON "LancamentoCaixa"("pagamentoRepasseId");

-- AddForeignKey
ALTER TABLE "PagamentoRepasse" ADD CONSTRAINT "PagamentoRepasse_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoCaixa" ADD CONSTRAINT "LancamentoCaixa_pagamentoRepasseId_fkey" FOREIGN KEY ("pagamentoRepasseId") REFERENCES "PagamentoRepasse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
