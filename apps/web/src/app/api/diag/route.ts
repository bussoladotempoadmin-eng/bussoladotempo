import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';

// DIAGNÓSTICO TEMPORÁRIO — remover depois de resolver o deploy.
// Expõe o erro real do Prisma no corpo da resposta (NextAuth engole o erro).
export const dynamic = 'force-dynamic';

export async function GET() {
  const out: Record<string, unknown> = {};
  const db = process.env.DATABASE_URL;
  out.hasDatabaseUrl = Boolean(db);
  out.databaseUrlMasked = db ? db.replace(/:\/\/[^@]+@/, '://***@').slice(0, 70) : null;
  out.hasDirectUrl = Boolean(process.env.DIRECT_URL);
  out.hasNextauthSecret = Boolean(process.env.NEXTAUTH_SECRET);
  out.nextauthUrl = process.env.NEXTAUTH_URL ?? null;
  try {
    out.frentes = await prisma.frente.count();
    out.queryOk = true;
  } catch (e) {
    const err = e as { message?: string; constructor?: { name?: string }; stack?: string };
    out.queryOk = false;
    out.error = err?.message;
    out.errorName = err?.constructor?.name;
    out.stack = String(err?.stack ?? '').split('\n').slice(0, 10);
  }
  return NextResponse.json(out, { status: 200 });
}
