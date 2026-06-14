import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { hashSenha, validarSenha } from '@/lib/senha';

export const dynamic = 'force-dynamic';

// POST /api/auth/registrar  body: { nome, email, senha }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const nome = typeof b?.nome === 'string' ? b.nome.trim() : '';
  const email = typeof b?.email === 'string' ? b.email.toLowerCase().trim() : '';
  const senha = typeof b?.senha === 'string' ? b.senha : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  const erroSenha = validarSenha(senha);
  if (erroSenha) return NextResponse.json({ error: erroSenha }, { status: 400 });

  const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existente) {
    return NextResponse.json(
      { error: 'Esse e-mail já tem conta. Faça login ou use “Esqueci a senha”.' },
      { status: 409 },
    );
  }

  const senhaHash = await hashSenha(senha);
  await prisma.user.create({
    data: { email, name: nome || null, senhaHash },
  });

  return NextResponse.json({ ok: true });
}
