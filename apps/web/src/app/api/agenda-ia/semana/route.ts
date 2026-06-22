import { NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { revisarEPlanejarComCache, lerRitualCache, SemChaveIA } from '@/lib/ai-agenda';
import { statusCota, registrarGeracao, mensagemCota } from '@/lib/cota-ia';
import { contaBloqueada } from '@/lib/acesso';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/agenda-ia/semana  body: { semanaIso }
// Comando combinado: analisa a semana e propõe a próxima (uma chamada de IA).
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

  const force = Boolean(body?.force);

  try {
    // Reabrir o resultado salvo é grátis (não checa cota nem conta).
    // Só verifica/consome a cota quando vai REALMENTE gerar (cache vazio ou force).
    const cache = await lerRitualCache(workspace.id, semanaIso);
    if (!cache || force) {
      const cota = await statusCota(workspace.id);
      // Regeração explícita (force) ignora a trava SEMANAL — é re-rolar a mesma
      // semana, não gerar uma nova. Só o teto MENSAL bloqueia. E como
      // registrarGeracao é idempotente por semana, re-gerar não cobra de novo.
      const bloqueado = force ? cota.motivo === 'mes' : !cota.podeGerar;
      if (bloqueado) {
        return NextResponse.json({ error: mensagemCota(cota), motivo: cota.motivo }, { status: 429 });
      }
    }
    const r = await revisarEPlanejarComCache(workspace.id, semanaIso, force);
    // Só cobra geração NOVA e ÚTIL (com proposta ou análise). O cache já foi
    // gravado antes daqui, então toda cobrança tem resultado recuperável de graça.
    // Falhar ao registrar o crédito NUNCA derruba a entrega — é melhor não cobrar.
    if (!r.cacheado) {
      const util = (r.proposta?.blocos?.length ?? 0) > 0 || (r.analise?.length ?? 0) > 0;
      if (util) {
        try {
          await registrarGeracao(workspace.id);
        } catch (err) {
          console.error('[agenda-ia] resultado entregue, mas falhou ao registrar crédito:', err);
        }
      }
    }
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof SemChaveIA) {
      return NextResponse.json(
        { error: 'A IA ainda não está configurada (falta a chave da Anthropic).' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : 'Falha ao revisar e planejar.';
    const nome = e instanceof Error ? e.name : '';
    const ehTimeout = /timeout|timed out|aborted|aborterror/i.test(`${nome} ${msg}`);
    if (ehTimeout) {
      // Falhou antes de cobrar — nenhum crédito é consumido. O usuário pode tentar de novo.
      return NextResponse.json(
        { error: 'A IA demorou demais e foi interrompida. Tente de novo — nenhum crédito foi usado.' },
        { status: 504 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
