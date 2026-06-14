-- AlterTable: liga/desliga do módulo comercial na organização
ALTER TABLE "Organizacao" ADD COLUMN "comercialAtivo" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "StatusAcao" AS ENUM ('EM_PLANEJAMENTO', 'FINALIZADO', 'ADIADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "coordenadorId" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAcaoComercial" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoAcaoComercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcaoComercial" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "responsaveis" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "detalhe" TEXT,
    "valorSolicitado" DOUBLE PRECISION,
    "status" "StatusAcao" NOT NULL DEFAULT 'EM_PLANEJAMENTO',
    "resultado" TEXT,
    "resultadoQtd" INTEGER,
    "valorGasto" DOUBLE PRECISION,
    "comentarios" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcaoComercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unidade_organizacaoId_idx" ON "Unidade"("organizacaoId");

-- CreateIndex
CREATE INDEX "Unidade_coordenadorId_idx" ON "Unidade"("coordenadorId");

-- CreateIndex
CREATE INDEX "TipoAcaoComercial_organizacaoId_idx" ON "TipoAcaoComercial"("organizacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAcaoComercial_organizacaoId_nome_key" ON "TipoAcaoComercial"("organizacaoId", "nome");

-- CreateIndex
CREATE INDEX "AcaoComercial_unidadeId_idx" ON "AcaoComercial"("unidadeId");

-- CreateIndex
CREATE INDEX "AcaoComercial_status_idx" ON "AcaoComercial"("status");

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_coordenadorId_fkey" FOREIGN KEY ("coordenadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoAcaoComercial" ADD CONSTRAINT "TipoAcaoComercial_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoComercial" ADD CONSTRAINT "AcaoComercial_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
