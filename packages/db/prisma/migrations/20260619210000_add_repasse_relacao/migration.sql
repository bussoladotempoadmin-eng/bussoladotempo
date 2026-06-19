-- CreateEnum
CREATE TYPE "RepasseStatus" AS ENUM ('PENDENTE', 'FEITO', 'PARCIAL', 'NAO_FEITO');

-- AlterTable
ALTER TABLE "LancamentoCaixa" ADD COLUMN     "repasseId" TEXT;

-- CreateTable
CREATE TABLE "Repasse" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "periodoDe" TIMESTAMP(3) NOT NULL,
    "periodoAte" TIMESTAMP(3) NOT NULL,
    "valorSolicitado" DOUBLE PRECISION NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "status" "RepasseStatus" NOT NULL DEFAULT 'PENDENTE',
    "valorPago" DOUBLE PRECISION,
    "dataPagamento" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repasse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoCaixa_repasseId_key" ON "LancamentoCaixa"("repasseId");

-- CreateIndex
CREATE INDEX "Repasse_organizacaoId_idx" ON "Repasse"("organizacaoId");

-- CreateIndex
CREATE INDEX "Repasse_unidadeId_idx" ON "Repasse"("unidadeId");

-- AddForeignKey
ALTER TABLE "LancamentoCaixa" ADD CONSTRAINT "LancamentoCaixa_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repasse" ADD CONSTRAINT "Repasse_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repasse" ADD CONSTRAINT "Repasse_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
