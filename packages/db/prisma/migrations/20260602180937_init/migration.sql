-- CreateEnum
CREATE TYPE "SemanaInicio" AS ENUM ('DOMINGO', 'SEGUNDA');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('IMPORTANTE', 'URGENTE', 'DISPERSO');

-- CreateEnum
CREATE TYPE "StatusSemana" AS ENUM ('PLANEJANDO', 'ATIVA', 'REVISAO', 'FECHADA');

-- CreateEnum
CREATE TYPE "FonteOrigem" AS ENUM ('MANUAL', 'AGENDA_PADRAO', 'CALENDAR_IMPORT');

-- CreateEnum
CREATE TYPE "TipoInsight" AS ENUM ('GOOD', 'WARN', 'TIP', 'NEUTRAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Meu workspace',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "semanaInicio" "SemanaInicio" NOT NULL DEFAULT 'DOMINGO',
    "horaAcordar" TEXT NOT NULL DEFAULT '06:00',
    "horaDormir" TEXT NOT NULL DEFAULT '22:30',
    "horaAlmocoIni" TEXT NOT NULL DEFAULT '12:00',
    "horaAlmocoFim" TEXT NOT NULL DEFAULT '13:30',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frente" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "icone" TEXT NOT NULL DEFAULT '📌',
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "orcamentoHoras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Frente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompromissoFixo" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "frenteId" TEXT,
    "categoria" "Categoria" NOT NULL DEFAULT 'IMPORTANTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompromissoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanaPlano" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "semanaIso" TEXT NOT NULL,
    "status" "StatusSemana" NOT NULL DEFAULT 'PLANEJANDO',
    "prioridade1" TEXT,
    "prioridade2" TEXT,
    "prioridade3" TEXT,
    "riscoSemana" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanaPlano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloco" (
    "id" TEXT NOT NULL,
    "semanaPlanoId" TEXT NOT NULL,
    "frenteId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "tarefa" TEXT NOT NULL,
    "categoriaPlanejada" "Categoria" NOT NULL,
    "categoriaRealizada" "Categoria" NOT NULL,
    "motivoDesvio" TEXT,
    "prioridadeSemana" INTEGER,
    "invadido" BOOLEAN NOT NULL DEFAULT false,
    "fonteOrigem" "FonteOrigem" NOT NULL DEFAULT 'MANUAL',
    "externalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bloco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revisao" (
    "id" TEXT NOT NULL,
    "semanaPlanoId" TEXT NOT NULL,
    "retroFuncionou" TEXT,
    "retroNaoFuncionou" TEXT,
    "retroMudanca" TEXT,
    "sensacaoMedia" INTEGER,
    "fechadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "semanaPlanoId" TEXT NOT NULL,
    "tipo" "TipoInsight" NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "frenteId" TEXT,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE INDEX "Frente_workspaceId_idx" ON "Frente"("workspaceId");

-- CreateIndex
CREATE INDEX "CompromissoFixo_workspaceId_idx" ON "CompromissoFixo"("workspaceId");

-- CreateIndex
CREATE INDEX "SemanaPlano_workspaceId_idx" ON "SemanaPlano"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SemanaPlano_workspaceId_semanaIso_key" ON "SemanaPlano"("workspaceId", "semanaIso");

-- CreateIndex
CREATE INDEX "Bloco_semanaPlanoId_idx" ON "Bloco"("semanaPlanoId");

-- CreateIndex
CREATE INDEX "Bloco_frenteId_idx" ON "Bloco"("frenteId");

-- CreateIndex
CREATE UNIQUE INDEX "Revisao_semanaPlanoId_key" ON "Revisao"("semanaPlanoId");

-- CreateIndex
CREATE INDEX "Insight_semanaPlanoId_idx" ON "Insight"("semanaPlanoId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frente" ADD CONSTRAINT "Frente_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompromissoFixo" ADD CONSTRAINT "CompromissoFixo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompromissoFixo" ADD CONSTRAINT "CompromissoFixo_frenteId_fkey" FOREIGN KEY ("frenteId") REFERENCES "Frente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemanaPlano" ADD CONSTRAINT "SemanaPlano_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloco" ADD CONSTRAINT "Bloco_semanaPlanoId_fkey" FOREIGN KEY ("semanaPlanoId") REFERENCES "SemanaPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloco" ADD CONSTRAINT "Bloco_frenteId_fkey" FOREIGN KEY ("frenteId") REFERENCES "Frente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisao" ADD CONSTRAINT "Revisao_semanaPlanoId_fkey" FOREIGN KEY ("semanaPlanoId") REFERENCES "SemanaPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_semanaPlanoId_fkey" FOREIGN KEY ("semanaPlanoId") REFERENCES "SemanaPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;
