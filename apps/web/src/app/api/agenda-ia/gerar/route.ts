import { NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { gerarAgendaIA, SemChaveIA } from '@/lib/ai-agenda';
import { statusCota, registrarGeracao, mensagemCota } from '@/lib/cota-ia';
import { contaBloqueada } from '@/lib/acesso';

// Geração com IA pode levar até ~1min — folga no timeout serverless (Pro: 300s).
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// POST /api/agenda-ia/gerar  body: { semanaIso, semanasHistorico? }
// Devolve uma PROPOSTA (não salva nada).
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (await contaBloqueada(workspace.userId)) {
    return NextResponse.json({ error: 'Conta suspensa. Regularize pra voltar a usar.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const semanaIso = body?.semanaIso;
  if (!semanaIso || !isIsoWeek(semanaIso)) {
    return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
  }
  const semanasHistorico = Math.min(Math.max(Number(body?.semanasHistorico) || 4, 1), 8);

  // Trava de cota: 1 geração/semana, 6/mês. Bloqueia ANTES de gastar IA.
  const cota = await statusCota(workspace.id);
  if (!cota.podeGerar) {
    return NextResponse.json({ error: mensagemCota(cota), motivo: cota.motivo }, { status: 429 });
  }

  try {
    const proposta = await gerarAgendaIA(workspace.id, semanaIso, semanasHistorico);
    // Só cobra quando a grade saiu (é o entregável). Geração sem blocos não
    // consome a cota da semana — o usuário pode tentar de novo.
    if ((proposta?.blocos?.length ?? 0) > 0) {
      try {
        await registrarGeracao(workspace.id);
      } catch (err) {
        console.error('[agenda-ia] grade entregue, mas falhou ao registrar crédito:', err);
      }
    }
    return NextResponse.json(proposta);
  } catch (e) {
    if (e instanceof SemChaveIA) {
      return NextResponse.json(
        { error: 'A IA ainda não está configurada (falta a chave da Anthropic).' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : 'Falha ao gerar a agenda.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
