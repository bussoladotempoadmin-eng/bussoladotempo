-- CreateEnum
CREATE TYPE "StatusSugestao" AS ENUM ('PENDENTE', 'ACEITA', 'DISPENSADA');

-- CreateTable
CREATE TABLE "Sugestao" (
    "id" TEXT NOT NULL,
    "deUserId" TEXT NOT NULL,
    "paraUserId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "status" "StatusSugestao" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sugestao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sugestao_paraUserId_idx" ON "Sugestao"("paraUserId");

-- CreateIndex
CREATE INDEX "Sugestao_deUserId_idx" ON "Sugestao"("deUserId");

-- AddForeignKey
ALTER TABLE "Sugestao" ADD CONSTRAINT "Sugestao_deUserId_fkey" FOREIGN KEY ("deUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sugestao" ADD CONSTRAINT "Sugestao_paraUserId_fkey" FOREIGN KEY ("paraUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
