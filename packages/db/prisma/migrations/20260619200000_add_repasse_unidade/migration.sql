-- CreateEnum
CREATE TYPE "MetodoRepasse" AS ENUM ('CARTAO_CORPORATIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CORRENTE', 'POUPANCA');

-- AlterTable
ALTER TABLE "Unidade" ADD COLUMN     "repasseMetodo" "MetodoRepasse",
ADD COLUMN     "repasseBanco" TEXT,
ADD COLUMN     "repasseAgencia" TEXT,
ADD COLUMN     "repasseConta" TEXT,
ADD COLUMN     "repasseTipoConta" "TipoConta",
ADD COLUMN     "repassePix" TEXT,
ADD COLUMN     "repasseCpfCnpj" TEXT,
ADD COLUMN     "repasseTitular" TEXT;
