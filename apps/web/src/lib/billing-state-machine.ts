/**
 * Máquina de estados de billing — roda 1×/dia (cron).
 * Referência: MODULO_PAGAMENTO_BLUEPRINT.md §4. Adaptada ao trial de 14 dias.
 *
 * Idempotência: ancorada em `Assinatura.ultimoEstadoBilling` (marcador). Se o
 * aviso daquele estágio já foi enviado, pula. Os marcadores avançam em ordem;
 * quando a conta paga, marcarCobranca() limpa o marcador e tudo recomeça.
 *
 * Trilha "antes de vencer" (TRIAL ou ATIVA, âncora = fim do trial / validade):
 *   D-7  → aviso "faltam 7 dias"
 *   D-3  → gera a cobrança (PENDENTE) + aviso "faltam 3 dias"
 *   D-1  → aviso "falta 1 dia"
 * Trilha "atraso" (depois de vencer):
 *   D+0  → transição → ATRASADA + aviso "pagamento em atraso"
 *   D+7  → aviso "última oportunidade"
 *   D+10 → transição → SUSPENSA + aviso "conta suspensa"
 *
 * Anti-corrida: transições de status usam updateMany com guarda de status —
 * se a conta foi paga entre a leitura e o update, count volta 0 e nada regride.
 */
import { prisma } from '@bussola/db';
import type { StatusAssinatura } from '@bussola/db';
import { valorCobranca } from './assinatura';
import { sendBillingEmail } from './email';

const DIA = 86400000;

// Marcadores em ordem monotônica.
const ORDEM = ['aviso_d7', 'aviso_d3', 'aviso_d1', 'overdue_d0', 'overdue_d7', 'overdue_d10'] as const;
type Marcador = (typeof ORDEM)[number];

function ordemDe(m: string | null): number {
  if (!m) return -1;
  return ORDEM.indexOf(m as Marcador);
}

function diasAte(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / DIA);
}

function appUrl(): string {
  return process.env.NEXTAUTH_URL ?? 'https://app.bussoladotempo.com.br';
}

export type ResultadoBilling = {
  avaliadas: number;
  emails: number;
  transicoes: number;
  cobrancasGeradas: number;
};

type Linha = {
  id: string;
  status: StatusAssinatura;
  assentos: number;
  ciclo: 'MENSAL' | 'ANUAL';
  trialTerminaEm: Date | null;
  planoExpiraEm: Date | null;
  ultimoEstadoBilling: string | null;
  owner: { name: string | null; email: string };
  plano: { precoMensal: number; precoAnual: number; precoPorAssento: number; assentosIncluidos: number };
};

export async function rodarMaquinaBilling(): Promise<ResultadoBilling> {
  const r: ResultadoBilling = { avaliadas: 0, emails: 0, transicoes: 0, cobrancasGeradas: 0 };

  const assinaturas = (await prisma.assinatura.findMany({
    where: { status: { in: ['TRIAL', 'ATIVA', 'ATRASADA'] } },
    select: {
      id: true,
      status: true,
      assentos: true,
      ciclo: true,
      trialTerminaEm: true,
      planoExpiraEm: true,
      ultimoEstadoBilling: true,
      owner: { select: { name: true, email: true } },
      plano: { select: { precoMensal: true, precoAnual: true, precoPorAssento: true, assentosIncluidos: true } },
    },
  })) as Linha[];

  for (const a of assinaturas) {
    r.avaliadas++;
    try {
      await processar(a, r);
    } catch (e) {
      console.error('[billing] erro na assinatura', a.id, e);
    }
  }
  return r;
}

async function processar(a: Linha, r: ResultadoBilling) {
  const nome = a.owner.name?.trim() || a.owner.email;
  const email = a.owner.email;
  const url = appUrl();

  // ---------- ATRASADA: trilha de atraso ----------
  if (a.status === 'ATRASADA') {
    const ancora = a.planoExpiraEm ?? a.trialTerminaEm;
    if (!ancora) return;
    const diasAtraso = -diasAte(ancora);
    const ord = ordemDe(a.ultimoEstadoBilling);

    if (diasAtraso >= 10 && ord < ordemDe('overdue_d10')) {
      const ok = await transicao(a.id, 'ATRASADA', 'SUSPENSA', 'overdue_d10');
      if (ok) {
        r.transicoes++;
        await sendBillingEmail({
          to: email,
          subject: 'Sua conta foi suspensa · Bússola do Tempo',
          titulo: 'Conta suspensa',
          paragrafos: [
            `Olá, ${nome}.`,
            'Como não identificamos o pagamento, sua conta na Bússola do Tempo foi suspensa e o acesso está bloqueado.',
            'Quer voltar? É só regularizar o pagamento que reativamos na hora. Fale com a gente pelo WhatsApp (33) 99139-3031.',
          ],
          ctaLabel: 'Falar no WhatsApp',
          ctaUrl: 'https://wa.me/5533991393031',
        });
        r.emails++;
      }
      return;
    }
    if (diasAtraso >= 7 && ord < ordemDe('overdue_d7')) {
      await sendBillingEmail({
        to: email,
        subject: 'Última chance antes de suspender · Bússola do Tempo',
        titulo: 'Última oportunidade',
        paragrafos: [
          `Olá, ${nome}.`,
          'Seu pagamento ainda está em aberto. Em alguns dias a conta será suspensa e você perde o acesso.',
          'Regularize agora pra não perder seu histórico e suas semanas montadas.',
        ],
        ctaLabel: 'Acessar minha conta',
        ctaUrl: url,
      });
      await marcar(a.id, 'overdue_d7');
      r.emails++;
      return;
    }
    return;
  }

  // ---------- TRIAL / ATIVA: trilha antes de vencer ----------
  const ancora = a.status === 'TRIAL' ? a.trialTerminaEm : a.planoExpiraEm;
  if (!ancora) return;
  const dias = diasAte(ancora);
  const ord = ordemDe(a.ultimoEstadoBilling);
  const ehTrial = a.status === 'TRIAL';

  // Venceu → ATRASADA
  if (dias <= 0) {
    const ok = await transicao(a.id, a.status, 'ATRASADA', 'overdue_d0');
    if (ok) {
      r.transicoes++;
      await gerarCobrancaSeNecessario(a, ancora, r);
      await sendBillingEmail({
        to: email,
        subject: ehTrial ? 'Seu teste terminou · Bússola do Tempo' : 'Pagamento em atraso · Bússola do Tempo',
        titulo: ehTrial ? 'Seu teste grátis terminou' : 'Pagamento em atraso',
        paragrafos: [
          `Olá, ${nome}.`,
          ehTrial
            ? 'Seus 14 dias grátis acabaram. Pra continuar com tudo funcionando, é só ativar seu plano.'
            : 'Não identificamos o pagamento da renovação. Regularize pra manter seu acesso ativo.',
          'Qualquer dúvida, fale com a gente pelo WhatsApp (33) 99139-3031.',
        ],
        ctaLabel: 'Ativar meu plano',
        ctaUrl: url,
      });
      r.emails++;
    }
    return;
  }

  if (dias <= 1 && ord < ordemDe('aviso_d1')) {
    await sendBillingEmail({
      to: email,
      subject: ehTrial ? 'Falta 1 dia do seu teste · Bússola do Tempo' : 'Sua renovação é amanhã · Bússola do Tempo',
      titulo: ehTrial ? 'Falta 1 dia' : 'Renovação amanhã',
      paragrafos: [
        `Olá, ${nome}.`,
        ehTrial
          ? 'Amanhã seus 14 dias grátis terminam. Garanta que não vai perder o ritmo: ative seu plano.'
          : 'Sua assinatura renova amanhã. Deixe o pagamento em dia pra não ter interrupção.',
      ],
      ctaLabel: 'Ver minha conta',
      ctaUrl: url,
    });
    await marcar(a.id, 'aviso_d1');
    r.emails++;
    return;
  }

  if (dias <= 3 && ord < ordemDe('aviso_d3')) {
    await gerarCobrancaSeNecessario(a, ancora, r);
    await sendBillingEmail({
      to: email,
      subject: ehTrial ? 'Faltam 3 dias do seu teste · Bússola do Tempo' : 'Renovação em 3 dias · Bússola do Tempo',
      titulo: ehTrial ? 'Faltam 3 dias' : 'Renovação em 3 dias',
      paragrafos: [
        `Olá, ${nome}.`,
        ehTrial
          ? 'Seu teste grátis termina em 3 dias. Já deixamos sua cobrança pronta — é só pagar pra seguir sem interrupção.'
          : 'Sua renovação acontece em 3 dias. Sua cobrança já está disponível.',
      ],
      ctaLabel: 'Ver cobrança',
      ctaUrl: url,
    });
    await marcar(a.id, 'aviso_d3');
    r.emails++;
    return;
  }

  if (dias <= 7 && ord < ordemDe('aviso_d7')) {
    await sendBillingEmail({
      to: email,
      subject: ehTrial ? 'Faltam 7 dias do seu teste · Bússola do Tempo' : 'Renovação em 7 dias · Bússola do Tempo',
      titulo: ehTrial ? 'Faltam 7 dias' : 'Renovação em 7 dias',
      paragrafos: [
        `Olá, ${nome}.`,
        ehTrial
          ? 'Como estão suas semanas? Você tem mais 7 dias de teste grátis. Aproveite pra deixar sua rotina redonda.'
          : 'Passando pra avisar: sua assinatura renova em 7 dias. Está tudo certo por aí?',
      ],
      ctaLabel: 'Abrir a Bússola',
      ctaUrl: url,
    });
    await marcar(a.id, 'aviso_d7');
    r.emails++;
    return;
  }
}

/** Transição de status protegida contra corrida (só muda se ainda estiver em `de`). */
async function transicao(id: string, de: StatusAssinatura, para: StatusAssinatura, marcador: Marcador): Promise<boolean> {
  const res = await prisma.assinatura.updateMany({
    where: { id, status: de },
    data: { status: para, ultimoEstadoBilling: marcador, ultimoEstadoBillingEm: new Date() },
  });
  return res.count > 0;
}

async function marcar(id: string, marcador: Marcador) {
  await prisma.assinatura.update({
    where: { id },
    data: { ultimoEstadoBilling: marcador, ultimoEstadoBillingEm: new Date() },
  });
}

/** Cria uma cobrança PENDENTE se não houver nenhuma em aberto pra esta assinatura. */
async function gerarCobrancaSeNecessario(a: Linha, ancora: Date, r: ResultadoBilling) {
  const aberta = await prisma.cobranca.findFirst({
    where: { assinaturaId: a.id, status: 'PENDENTE' },
    select: { id: true },
  });
  if (aberta) return;

  const valor = valorCobranca(a.plano, a.assentos, a.ciclo);
  // Vencimento: fim do trial + 7 dias (trial) ou a própria validade (ativo).
  const venc = a.status === 'TRIAL' ? new Date(ancora.getTime() + 7 * DIA) : new Date(ancora.getTime());
  const mesRef = `${venc.getUTCFullYear()}-${String(venc.getUTCMonth() + 1).padStart(2, '0')}`;

  await prisma.cobranca.create({
    data: {
      assinaturaId: a.id,
      valor,
      vencimento: venc,
      metodo: 'MANUAL',
      status: 'PENDENTE',
      mesRef,
      nota: 'Gerada automaticamente pela máquina de billing',
    },
  });
  r.cobrancasGeradas++;
}
