-- CreateEnum
CREATE TYPE "NivelComercial" AS ENUM ('VER', 'EDITAR');

-- CreateTable
CREATE TABLE "AcessoComercial" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nivel" "NivelComercial" NOT NULL DEFAULT 'EDITAR',
    "todasUnidades" BOOLEAN NOT NULL DEFAULT false,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "rotulo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoComercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoComercialUnidade" (
    "acessoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,

    CONSTRAINT "AcessoComercialUnidade_pkey" PRIMARY KEY ("acessoId","unidadeId")
);

-- CreateIndex
CREATE INDEX "AcessoComercial_organizacaoId_idx" ON "AcessoComercial"("organizacaoId");

-- CreateIndex
CREATE INDEX "AcessoComercial_userId_idx" ON "AcessoComercial"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AcessoComercial_organizacaoId_userId_key" ON "AcessoComercial"("organizacaoId", "userId");

-- CreateIndex
CREATE INDEX "AcessoComercialUnidade_unidadeId_idx" ON "AcessoComercialUnidade"("unidadeId");

-- AddForeignKey
ALTER TABLE "AcessoComercial" ADD CONSTRAINT "AcessoComercial_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoComercial" ADD CONSTRAINT "AcessoComercial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoComercialUnidade" ADD CONSTRAINT "AcessoComercialUnidade_acessoId_fkey" FOREIGN KEY ("acessoId") REFERENCES "AcessoComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoComercialUnidade" ADD CONSTRAINT "AcessoComercialUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
