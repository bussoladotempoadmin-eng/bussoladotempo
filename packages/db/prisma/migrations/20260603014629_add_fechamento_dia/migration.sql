-- CreateTable
CREATE TABLE "FechamentoDia" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "destaque" TEXT,
    "aprendizado" TEXT,
    "nota" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FechamentoDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FechamentoDia_workspaceId_idx" ON "FechamentoDia"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FechamentoDia_workspaceId_data_key" ON "FechamentoDia"("workspaceId", "data");

-- AddForeignKey
ALTER TABLE "FechamentoDia" ADD CONSTRAINT "FechamentoDia_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
