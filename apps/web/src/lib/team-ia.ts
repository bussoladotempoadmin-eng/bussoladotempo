/**
 * Análise da IA do Time (Fase 4.6).
 * O Claude lê a distribuição de tempo do galho do gestor (NUNCA reflexões) e
 * devolve insights de gestão. Cache + trava 1x/semana, igual ao individual.
 * Cache guardado como Insight (titulo 'ia-time') na semana do gestor.
 */
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@bussola/db';
import { getOrCreateSemana } from './semana';
import { SemChaveIA } from './ai-agenda';
import { getPainelTime } from './painel-time';

const MODELO = 'claude-sonnet-4-6';
const CACHE_TITULO = 'ia-time';

function pct(f: number) {
  return Math.round(f * 100);
}

async function gestorSemanaId(gestorUserId: string, iso: string): Promise<string | null> {
  const ws = await prisma.workspace.findFirst({
    where: { userId: gestorUserId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!ws) return null;
  const semana = await getOrCreateSemana(ws.id, iso);
  return semana.id;
}

export async function lerTimeIACache(gestorUserId: string, iso: string): Promise<string[] | null> {
  const ws = await prisma.workspace.findFirst({
    where: { userId: gestorUserId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!ws) return null;
  const semana = await prisma.semanaPlano.findUnique({
    where: { workspaceId_semanaIso: { workspaceId: ws.id, semanaIso: iso } },
    select: { id: true },
  });
  if (!semana) return null;
  const row = await prisma.insight.findFirst({
    where: { semanaPlanoId: semana.id, titulo: CACHE_TITULO },
    orderBy: { geradoEm: 'desc' },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.texto) as string[];
  } catch {
    return null;
  }
}

async function salvar(gestorUserId: string, iso: string, insights: string[]) {
  const semanaId = await gestorSemanaId(gestorUserId, iso);
  if (!semanaId) return;
  await prisma.insight.deleteMany({ where: { semanaPlanoId: semanaId, titulo: CACHE_TITULO } });
  await prisma.insight.create({
    data: { semanaPlanoId: semanaId, tipo: 'NEUTRAL', titulo: CACHE_TITULO, texto: JSON.stringify(insights) },
  });
}

export async function analisarTimeIA(
  gestorUserId: string,
  iso: string,
  force = false,
): Promise<{ insights: string[]; cacheado: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SemChaveIA();

  if (!force) {
    const c = await lerTimeIACache(gestorUserId, iso);
    if (c) return { insights: c, cacheado: true };
  }

  const painel = await getPainelTime(gestorUserId, iso);
  if (!painel || painel.membros.length === 0) return { insights: [], cacheado: false };

  const linhas = painel.membros
    .map((m) =>
      m.temDados
        ? `- ${m.nome}: ${m.totalHoras}h | Importante ${pct(m.pImportante)}%, Urgente ${pct(m.pUrgente)}%, Disperso ${pct(m.pDisperso)}% | foco: ${m.focoFrente ?? '-'}`
        : `- ${m.nome}: sem registro nesta semana`,
    )
    .join('\n');
  const agg = `Time (${painel.org.nome}): ${painel.agregado.totalHoras}h no total | Importante ${pct(painel.agregado.pImportante)}%, Urgente ${pct(painel.agregado.pUrgente)}%, Disperso ${pct(painel.agregado.pDisperso)}% | ${painel.agregado.comDados} de ${painel.agregado.total} registraram.`;

  // maxRetries:0 + timeout abaixo do maxDuration: falha limpa, sem retry zumbi.
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 55_000 });
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 1500,
    system: [
      'Você é o copiloto de um gestor na "Bússola do Tempo". Analisa COMO o tempo do time foi distribuído (Frentes × IMPORTANTE/URGENTE/DISPERSO) pra ajudar o gestor a dirigir esforço pro que traz resultado.',
      'Dê 3 a 5 insights curtos e ACIONÁVEIS, cada um citando um padrão CONCRETO com nomes/números (ex: "Fulano tem 35% Disperso — vale entender o que está vazando").',
      'Foque em: quem está em modo "apagar incêndio" (muito Urgente), onde o tempo vaza (Disperso), quem está bem alinhado (alto Importante) e quem quase não registrou.',
      'Tom de coach, não de vigia. Nada genérico. Responda SOMENTE chamando dar_insights_time.',
    ].join('\n'),
    messages: [{ role: 'user', content: `${agg}\n\nPor pessoa:\n${linhas}\n\nDê os insights de gestão.` }],
    tools: [
      {
        name: 'dar_insights_time',
        description: 'Devolve os insights de gestão sobre o tempo do time.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          properties: { insights: { type: 'array', items: { type: 'string' } } },
          required: ['insights'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'dar_insights_time' },
  });

  const bloco = response.content.find((b) => b.type === 'tool_use');
  if (!bloco || bloco.type !== 'tool_use') return { insights: [], cacheado: false };
  const out = bloco.input as { insights?: string[] };
  const insights = (out.insights ?? []).filter((s) => typeof s === 'string' && s.trim());
  await salvar(gestorUserId, iso, insights);
  return { insights, cacheado: false };
}
