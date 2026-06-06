-- CreateTable
CREATE TABLE "SubTarefa" (
    "id" TEXT NOT NULL,
    "blocoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubTarefa_blocoId_idx" ON "SubTarefa"("blocoId");

-- AddForeignKey
ALTER TABLE "SubTarefa" ADD CONSTRAINT "SubTarefa_blocoId_fkey" FOREIGN KEY ("blocoId") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;
