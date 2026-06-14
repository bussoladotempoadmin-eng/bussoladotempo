import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { hashSenha, validarSenha } from '@/lib/senha';

export const dynamic = 'force-dynamic';

// POST /api/auth/redefinir-senha  body: { token, senha }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const token = typeof b?.token === 'string' ? b.token : '';
  const senha = typeof b?.senha === 'string' ? b.senha : '';
  if (!token) return NextResponse.json({ error: 'Token ausente.' }, { status: 400 });

  const erroSenha = validarSenha(senha);
  if (erroSenha) return NextResponse.json({ error: erroSenha }, { status: 400 });

  const registro = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!registro || registro.expires < new Date()) {
    return NextResponse.json(
      { error: 'Link inválido ou expirado. Peça um novo.' },
      { status: 400 },
    );
  }

  const senhaHash = await hashSenha(senha);
  await prisma.user.update({ where: { id: registro.userId }, data: { senhaHash } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: registro.userId } });

  return NextResponse.json({ ok: true });
}
