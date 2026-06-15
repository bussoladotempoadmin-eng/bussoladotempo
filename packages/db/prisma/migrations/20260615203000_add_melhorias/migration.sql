-- AlterTable
ALTER TABLE "Bloco" ADD COLUMN     "concluido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "concluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingVisto" BOOLEAN NOT NULL DEFAULT false;
