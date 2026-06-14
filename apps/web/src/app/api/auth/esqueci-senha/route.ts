import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@bussola/db';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/auth/esqueci-senha  body: { email }
// Sempre responde ok (não revela se o e-mail existe).
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = typeof b?.email === 'string' ? b.email.toLowerCase().trim() : '';
  if (!email) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    // Invalida tokens antigos e cria um novo (vale 1 hora).
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expires } });

    const base = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    const link = `${base}/redefinir-senha?token=${token}`;
    try {
      await sendPasswordResetEmail({ to: email, link });
    } catch (e) {
      console.error('[esqueci-senha] falha ao enviar e-mail:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
