import { NextResponse } from 'next/server';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@bussola/db';
import { sendAcessoCriadoEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Valida a assinatura HMAC SHA-256 que o TriboCRM envia (X-TriboCRM-Signature: sha256=<hex>).
function assinaturaValida(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const recebido = header.replace(/^sha256=/i, '').trim();
  const esperado = createHmac('sha256', secret).update(raw).digest('hex');
  if (recebido.length !== esperado.length) return false;
  try {
    return timingSafeEqual(Buffer.from(recebido, 'hex'), Buffer.from(esperado, 'hex'));
  } catch {
    return false;
  }
}

// Procura uma chave (em vários nomes/níveis comuns do payload).
function pegar(body: unknown, ...keys: string[]): string {
  const fontes: unknown[] = [
    body,
    (body as Record<string, unknown>)?.lead,
    (body as Record<string, unknown>)?.data,
    ((body as Record<string, unknown>)?.data as Record<string, unknown>)?.lead,
    (body as Record<string, unknown>)?.payload,
  ];
  for (const f of fontes) {
    if (!f || typeof f !== 'object') continue;
    const o = f as Record<string, unknown>;
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

// POST /api/webhooks/tribo?token=...  — TriboCRM dispara em "lead.created".
// Cria o acesso na Bússola e manda e-mail pra pessoa criar a senha.
export async function POST(req: Request) {
  const url = new URL(req.url);
  // Lê o corpo CRU (a assinatura é calculada sobre os bytes exatos).
  const raw = await req.text();

  const secret = process.env.TRIBO_WEBHOOK_SECRET;
  if (secret) {
    const assinatura = req.headers.get('x-tribocrm-signature');
    if (!assinaturaValida(raw, assinatura, secret)) {
      return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });
    }
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  // Loga o payload bruto — assim confirmamos os nomes reais dos campos no 1º teste.
  console.log('[tribo-webhook] payload:', raw.slice(0, 2000));

  // Filtro anti-lixo: só age em leads do formulário da Bússola (se vier o id do form).
  const formId = process.env.TRIBO_FORM_ID;
  const formNoPayload = pegar(body, 'form', 'form_id', 'formId', 'formulario');
  if (formId && formNoPayload && formNoPayload !== formId) {
    return NextResponse.json({ ok: true, ignorado: 'outro formulário' });
  }

  const email = pegar(body, 'email', 'e_mail', 'lead_email', 'mail').toLowerCase();
  const nome = pegar(body, 'nome', 'name', 'lead_nome', 'first_name', 'nome_completo');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // 200 pra o TriboCRM não ficar re-tentando; só não criamos acesso.
    return NextResponse.json({ ok: true, ignorado: 'sem e-mail válido' });
  }

  const existente = await prisma.user.findUnique({
    where: { email },
    select: { id: true, senhaHash: true },
  });

  // Já tem conta COM senha → não faz nada (evita reenvio/spam).
  if (existente?.senhaHash) {
    return NextResponse.json({ ok: true, jaTinhaAcesso: true });
  }

  const userId = existente
    ? existente.id
    : (await prisma.user.create({ data: { email, name: nome || null }, select: { id: true } })).id;

  // Token de acesso (reusa o fluxo de redefinir-senha) — vale 7 dias.
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: { userId, token, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const base = process.env.NEXTAUTH_URL ?? url.origin;
  const link = `${base}/redefinir-senha?token=${token}`;
  try {
    await sendAcessoCriadoEmail({ to: email, nome, link });
  } catch (e) {
    console.error('[tribo-webhook] falha ao enviar e-mail:', e);
  }

  return NextResponse.json({ ok: true, criado: !existente });
}
