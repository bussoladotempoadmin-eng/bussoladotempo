-- AlterTable: gerações extras compradas (billing-ready)
ALTER TABLE "Workspace" ADD COLUMN "geracoesExtras" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GeracaoIA" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "isoWeek" TEXT NOT NULL,
    "mesRef" TEXT NOT NULL,
    "semanasAplicadas" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeracaoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeracaoIA_workspaceId_mesRef_idx" ON "GeracaoIA"("workspaceId", "mesRef");

-- CreateIndex
CREATE INDEX "GeracaoIA_workspaceId_isoWeek_idx" ON "GeracaoIA"("workspaceId", "isoWeek");

-- AddForeignKey
ALTER TABLE "GeracaoIA" ADD CONSTRAINT "GeracaoIA_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
