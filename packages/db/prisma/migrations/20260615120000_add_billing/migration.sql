-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVA', 'ATRASADA', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CicloPlano" AS ENUM ('MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'BOLETO', 'CARTAO', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoDesconto" AS ENUM ('PERCENTUAL', 'FIXO');

-- CreateEnum
CREATE TYPE "DuracaoCupom" AS ENUM ('PRIMEIRO', 'RECORRENTE');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('PENDENTE', 'DISPONIVEL', 'PAGA', 'ESTORNADA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Plano" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoAnual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoPorAssento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assentosIncluidos" INTEGER NOT NULL DEFAULT 1,
    "moduloTimeAtivo" BOOLEAN NOT NULL DEFAULT false,
    "moduloComercialAtivo" BOOLEAN NOT NULL DEFAULT false,
    "geracoesIaMes" INTEGER NOT NULL DEFAULT 6,
    "maxAssentos" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "organizacaoId" TEXT,
    "planoId" TEXT NOT NULL,
    "ciclo" "CicloPlano" NOT NULL DEFAULT 'MENSAL',
    "status" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
    "assentos" INTEGER NOT NULL DEFAULT 1,
    "trialTerminaEm" TIMESTAMP(3),
    "planoIniciadoEm" TIMESTAMP(3),
    "planoExpiraEm" TIMESTAMP(3),
    "metodoPreferido" "MetodoPagamento" NOT NULL DEFAULT 'MANUAL',
    "descontoTipo" "TipoDesconto",
    "descontoValor" DOUBLE PRECISION,
    "descontoDe" TIMESTAMP(3),
    "descontoAte" TIMESTAMP(3),
    "descontoCiclos" INTEGER,
    "descontoMotivo" TEXT,
    "efiSubscriptionId" TEXT,
    "efiSubscriptionStatus" TEXT,
    "cartaoFinal" TEXT,
    "cartaoBandeira" TEXT,
    "proximaCobrancaEm" TIMESTAMP(3),
    "ultimoEstadoBilling" TEXT,
    "ultimoEstadoBillingEm" TIMESTAMP(3),
    "indicadoPorParceiroId" TEXT,
    "indicadoEm" TIMESTAMP(3),
    "notasInternas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descontoValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "pagaEm" TIMESTAMP(3),
    "metodo" "MetodoPagamento" NOT NULL DEFAULT 'MANUAL',
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "mesRef" TEXT NOT NULL,
    "efiCobrancaId" TEXT,
    "boletoUrl" TEXT,
    "pixCopiaECola" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "descontoTipo" "TipoDesconto" NOT NULL,
    "descontoValor" DOUBLE PRECISION NOT NULL,
    "planosAplicaveis" TEXT[],
    "maxUsos" INTEGER,
    "maxUsosPorUser" INTEGER,
    "usados" INTEGER NOT NULL DEFAULT 0,
    "validoDe" TIMESTAMP(3),
    "validoAte" TIMESTAMP(3),
    "duracaoTipo" "DuracaoCupom" NOT NULL DEFAULT 'PRIMEIRO',
    "duracaoMeses" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parceiro" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "comissaoTiers" JSONB,
    "comissaoRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pixChave" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "tipoConta" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComissaoParceiro" (
    "id" TEXT NOT NULL,
    "parceiroId" TEXT NOT NULL,
    "cobrancaId" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "comissao" DOUBLE PRECISION NOT NULL,
    "status" "StatusComissao" NOT NULL DEFAULT 'PENDENTE',
    "disponivelEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComissaoParceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaParceiro" (
    "id" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "parceiroAntigoId" TEXT,
    "parceiroNovoId" TEXT,
    "alteradoPor" TEXT,
    "fonte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrocaParceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plano_slug_key" ON "Plano"("slug");

-- CreateIndex
CREATE INDEX "Plano_ativo_idx" ON "Plano"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_ownerUserId_key" ON "Assinatura"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_organizacaoId_key" ON "Assinatura"("organizacaoId");

-- CreateIndex
CREATE INDEX "Assinatura_planoId_idx" ON "Assinatura"("planoId");

-- CreateIndex
CREATE INDEX "Assinatura_status_idx" ON "Assinatura"("status");

-- CreateIndex
CREATE INDEX "Assinatura_indicadoPorParceiroId_idx" ON "Assinatura"("indicadoPorParceiroId");

-- CreateIndex
CREATE INDEX "Cobranca_assinaturaId_idx" ON "Cobranca"("assinaturaId");

-- CreateIndex
CREATE INDEX "Cobranca_status_idx" ON "Cobranca"("status");

-- CreateIndex
CREATE INDEX "Cobranca_mesRef_idx" ON "Cobranca"("mesRef");

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_code_key" ON "Cupom"("code");

-- CreateIndex
CREATE INDEX "Cupom_ativo_idx" ON "Cupom"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Parceiro_code_key" ON "Parceiro"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Parceiro_userId_key" ON "Parceiro"("userId");

-- CreateIndex
CREATE INDEX "Parceiro_ativo_idx" ON "Parceiro"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ComissaoParceiro_cobrancaId_key" ON "ComissaoParceiro"("cobrancaId");

-- CreateIndex
CREATE INDEX "ComissaoParceiro_parceiroId_status_idx" ON "ComissaoParceiro"("parceiroId", "status");

-- CreateIndex
CREATE INDEX "ComissaoParceiro_status_disponivelEm_idx" ON "ComissaoParceiro"("status", "disponivelEm");

-- CreateIndex
CREATE INDEX "ComissaoParceiro_assinaturaId_idx" ON "ComissaoParceiro"("assinaturaId");

-- CreateIndex
CREATE INDEX "TrocaParceiro_assinaturaId_idx" ON "TrocaParceiro"("assinaturaId");

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_indicadoPorParceiroId_fkey" FOREIGN KEY ("indicadoPorParceiroId") REFERENCES "Parceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "Assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parceiro" ADD CONSTRAINT "Parceiro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoParceiro" ADD CONSTRAINT "ComissaoParceiro_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "Parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoParceiro" ADD CONSTRAINT "ComissaoParceiro_cobrancaId_fkey" FOREIGN KEY ("cobrancaId") REFERENCES "Cobranca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoParceiro" ADD CONSTRAINT "ComissaoParceiro_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "Assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaParceiro" ADD CONSTRAINT "TrocaParceiro_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "Assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaParceiro" ADD CONSTRAINT "TrocaParceiro_parceiroNovoId_fkey" FOREIGN KEY ("parceiroNovoId") REFERENCES "Parceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
