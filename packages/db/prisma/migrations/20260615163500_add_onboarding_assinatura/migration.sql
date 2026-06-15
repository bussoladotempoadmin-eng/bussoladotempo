-- CreateEnum
CREATE TYPE "OrigemAssinatura" AS ENUM ('AUTO', 'CADASTRO', 'ADMIN', 'TRIBO');

-- AlterTable
ALTER TABLE "Assinatura" ADD COLUMN     "aguardandoAtivacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "origem" "OrigemAssinatura" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "planoConfirmado" BOOLEAN NOT NULL DEFAULT false;
