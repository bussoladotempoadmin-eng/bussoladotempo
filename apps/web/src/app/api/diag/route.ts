import { NextResponse } from 'next/server';

// TEMPORÁRIO — diagnóstico de env do Google OAuth em produção.
// Não expõe os valores, só presença/tamanho/forma. Remover depois.
export const dynamic = 'force-dynamic';

export async function GET() {
  const id = process.env.GOOGLE_CLIENT_ID ?? '';
  const sec = process.env.GOOGLE_CLIENT_SECRET ?? '';
  return NextResponse.json({
    googleIdPresent: id.length > 0,
    googleIdLen: id.length,
    googleIdLooksValid: /\.apps\.googleusercontent\.com"?$/.test(id.trim()),
    googleIdHasQuotes: id.includes('"'),
    googleSecretPresent: sec.length > 0,
    googleSecretLen: sec.length,
    googleSecretPrefixOk: sec.replace(/"/g, '').trim().startsWith('GOCSPX-'),
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    nodeEnv: process.env.NODE_ENV,
  });
}
