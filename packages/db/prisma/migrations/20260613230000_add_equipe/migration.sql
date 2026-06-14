-- CreateEnum
CREATE TYPE "PapelEquipe" AS ENUM ('GESTOR', 'MEMBRO');

-- CreateTable
CREATE TABLE "Organizacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroEquipe" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "papel" "PapelEquipe" NOT NULL DEFAULT 'MEMBRO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembroEquipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organizacao_ownerId_idx" ON "Organizacao"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MembroEquipe_organizacaoId_userId_key" ON "MembroEquipe"("organizacaoId", "userId");

-- CreateIndex
CREATE INDEX "MembroEquipe_organizacaoId_idx" ON "MembroEquipe"("organizacaoId");

-- CreateIndex
CREATE INDEX "MembroEquipe_userId_idx" ON "MembroEquipe"("userId");

-- AddForeignKey
ALTER TABLE "Organizacao" ADD CONSTRAINT "Organizacao_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroEquipe" ADD CONSTRAINT "MembroEquipe_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroEquipe" ADD CONSTRAINT "MembroEquipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
