/**
 * Marca um usuário como Super Admin (acesso ao painel de gestão do produto).
 *
 * Uso:
 *   pnpm --filter @bussola/db exec tsx prisma/set-super-admin.ts seu-email@dominio.com
 *   pnpm --filter @bussola/db exec tsx prisma/set-super-admin.ts seu-email@dominio.com off   # remove
 */

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
      if (m) process.env.DATABASE_URL = m[1];
    }
  } catch {
    /* ignora */
  }
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const ligar = process.argv[3] !== 'off';
  if (!email) {
    console.error('Informe o e-mail: tsx prisma/set-super-admin.ts email@dominio.com [off]');
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { superAdmin: ligar },
    select: { email: true, superAdmin: true },
  });
  console.log(`✓ ${user.email} → superAdmin = ${user.superAdmin}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
