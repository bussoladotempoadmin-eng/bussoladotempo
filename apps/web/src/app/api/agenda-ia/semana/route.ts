import { NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { revisarEPlanejarComCache, lerRitualCache, SemChaveIA } from '@/lib/ai-agenda';
import { statusCota, registrarGeracao, mensagemCota } from '@/lib/cota-ia';
import { contaBloqueada } from '@/lib/acesso';

export const maxDuration = 300;
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
    const cache = await lerRitualCache(workspace.id, semanaIso);
    // Só conta como "resultado salvo" o cache que TEM grade. Um cache vazio (de uma
    // tentativa que não gerou blocos) não vale — vamos refazer.
    const cacheTemGrade = !!cache && (cache.proposta?.blocos?.length ?? 0) > 0;

    // Reabrir um resultado salvo COM grade é grátis (não checa cota nem gera).
    if (cacheTemGrade && !force) {
      return NextResponse.json({ ...cache, cacheado: true });
    }

    // Daqui pra baixo vai gerar. A cota só BLOQUEIA numa geração nova de verdade —
    // não quando estamos refazendo uma tentativa anterior que ficou sem grade
    // (essa não entregou nada, então refazer não deve custar uma cota nova).
    const recuperandoVazia = !!cache && !cacheTemGrade;
    if (!recuperandoVazia) {
      const cota = await statusCota(workspace.id);
      // Regra: 1 geração por semana ISO, teto de 6 por mês.
      if (!cota.podeGerar) {
        return NextResponse.json({ error: mensagemCota(cota), motivo: cota.motivo }, { status: 429 });
      }
    }

    // force=true aqui: sempre (re)gera, porque ou o usuário pediu ou o cache não
    // tinha grade. revisarEPlanejarComCache só GRAVA o cache quando a grade sai.
    const r = await revisarEPlanejarComCache(workspace.id, semanaIso, true);

    // Só cobra quando a GRADE saiu (é o entregável). registrarGeracao é idempotente
    // por semana ISO, então quem já tinha sido cobrado (ex.: tentativa vazia antiga)
    // NÃO é cobrado de novo. Falhar ao registrar nunca derruba a entrega.
    if ((r.proposta?.blocos?.length ?? 0) > 0) {
      try {
        await registrarGeracao(workspace.id);
      } catch (err) {
        console.error('[agenda-ia] grade entregue, mas falhou ao registrar crédito:', err);
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
