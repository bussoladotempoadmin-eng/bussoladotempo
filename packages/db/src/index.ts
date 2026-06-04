/**
 * @bussola/db — instância singleton do Prisma Client.
 *
 * Usa o driver `pg` via adapter (queryCompiler, sem engine nativo) — isso
 * elimina o binário .so.node, que dava problema no runtime serverless da Vercel.
 *
 * Uso: import { prisma } from '@bussola/db'
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Supabase exige SSL; rejectUnauthorized:false aceita o certificado deles.
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
