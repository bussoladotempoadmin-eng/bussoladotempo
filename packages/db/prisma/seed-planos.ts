/**
 * Seed dos PLANOS — catálogo de billing (Essencial / Pro / Enterprise).
 *
 * Idempotente: faz upsert por `slug`, então pode rodar quantas vezes quiser
 * sem duplicar. Só toca na tabela `Plano` (nada de usuário/assinatura).
 *
 * Preços (da landing v4):
 *   - Essencial  R$29,90/mês  — 1 pessoa (preço fixo)
 *   - Pro        R$39,90/acesso·mês — por assento, módulo de Time
 *   - Enterprise R$49,90/acesso·mês — por assento, Time + Comercial
 *
 * Fórmula de cobrança (ver apps/web/src/lib/assinatura.ts → valorCobranca):
 *   valor = precoMensal + max(0, assentos - assentosIncluidos) × precoPorAssento
 *
 * Rode com: pnpm --filter @bussola/db seed:planos
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

const PLANOS = [
  {
    slug: 'essencial',
    nome: 'Bússola Essencial',
    precoMensal: 29.9,
    precoAnual: 0, // anual ainda não ofertado
    precoPorAssento: 0,
    assentosIncluidos: 1,
    moduloTimeAtivo: false,
    moduloComercialAtivo: false,
    geracoesIaMes: 6,
    maxAssentos: 1,
    ativo: true,
  },
  {
    slug: 'pro',
    nome: 'Bússola Pro',
    precoMensal: 0,
    precoAnual: 0,
    precoPorAssento: 39.9,
    assentosIncluidos: 0, // tudo é cobrado por assento
    moduloTimeAtivo: true,
    moduloComercialAtivo: false,
    geracoesIaMes: 6,
    maxAssentos: null,
    ativo: true,
  },
  {
    slug: 'enterprise',
    nome: 'Bússola Enterprise',
    precoMensal: 0,
    precoAnual: 0,
    precoPorAssento: 49.9,
    assentosIncluidos: 0,
    moduloTimeAtivo: true,
    moduloComercialAtivo: true,
    geracoesIaMes: 6,
    maxAssentos: null,
    ativo: true,
  },
] as const;

async function main() {
  console.log('🌱 Semeando planos...');
  for (const p of PLANOS) {
    const { slug, ...rest } = p;
    const plano = await prisma.plano.upsert({
      where: { slug },
      update: rest,
      create: { slug, ...rest },
    });
    console.log(`✓ ${plano.nome} (${plano.slug})`);
  }
  console.log('🎉 Planos prontos.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de planos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
