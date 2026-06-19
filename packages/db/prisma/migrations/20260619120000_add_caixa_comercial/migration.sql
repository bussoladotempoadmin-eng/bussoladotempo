-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "LancamentoCaixa" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "automatico" BOOLEAN NOT NULL DEFAULT false,
    "acaoId" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoCaixa_acaoId_key" ON "LancamentoCaixa"("acaoId");

-- CreateIndex
CREATE INDEX "LancamentoCaixa_unidadeId_idx" ON "LancamentoCaixa"("unidadeId");

-- AddForeignKey
ALTER TABLE "LancamentoCaixa" ADD CONSTRAINT "LancamentoCaixa_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoCaixa" ADD CONSTRAINT "LancamentoCaixa_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "AcaoComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
