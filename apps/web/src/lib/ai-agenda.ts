/**
 * Agenda Padrão inteligente (IA).
 * Lê o histórico do workspace (planejado × realizado, reflexões, orçamentos,
 * compromissos fixos) e pede ao Claude uma proposta da próxima semana.
 * NÃO salva nada — devolve um rascunho que o usuário revisa e confirma.
 */
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@bussola/db';
import { shiftIsoWeek, isoWeekRangeLabel } from './iso-week';
import {
  diaSemanaValues,
  categoriaValues,
  type DiaSemana,
  type Categoria,
} from './schemas/compromisso';

const MODELO = 'claude-sonnet-4-6';

// Timeout abaixo do maxDuration (60s) da função: a chamada falha de forma LIMPA
// e capturável (vira JSON 500/504 tratado), em vez de estourar a função e voltar
// um 504 sem corpo. maxRetries:0 evita que o SDK re-tente 2x e multiplique custo
// de tokens e tempo (era a causa de "cobrou mais a cada tentativa").
const TIMEOUT_IA_MS = 55_000;

function criarClienteIA(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, maxRetries: 0, timeout: TIMEOUT_IA_MS });
}

// Sufixo "[real HH:mm-HH:mm]" quando o bloco foi executado fora do horário
// planejado (Caso 2 — desvio de horário). Vazio quando saiu no horário.
function sufixoHorarioReal(b: {
  horaInicio: string;
  horaFim: string;
  horaRealInicio: string | null;
  horaRealFim: string | null;
}): string {
  if (!b.horaRealInicio && !b.horaRealFim) return '';
  return ` [real ${b.horaRealInicio ?? b.horaInicio}-${b.horaRealFim ?? b.horaFim}]`;
}

export type PropostaBloco = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: Categoria;
};

export type PropostaAgenda = {
  resumo: string;
  insights: string[];
  blocos: PropostaBloco[];
  /** Quantas das semanas de histórico realmente tinham blocos (pro cold start). */
  semanasComDados: number;
  /** Histórico fino: a proposta é mais "ponto de partida" do que aprendida. */
  poucoHistorico: boolean;
};

/** Erro amigável quando a chave da Anthropic não está configurada. */
export class SemChaveIA extends Error {
  constructor() {
    super('IA não configurada (falta ANTHROPIC_API_KEY)');
    this.name = 'SemChaveIA';
  }
}

function diaLabel(d: DiaSemana) {
  return { SEG: 'Seg', TER: 'Ter', QUA: 'Qua', QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom' }[d];
}

/**
 * Gera a proposta de agenda para `semanaIsoAlvo`, aprendendo das últimas
 * `semanasHistorico` semanas anteriores a ela.
 */
export async function gerarAgendaIA(
  workspaceId: string,
  semanaIsoAlvo: string,
  semanasHistorico = 4,
): Promise<PropostaAgenda> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SemChaveIA();

  const [workspace, frentes, compromissos] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.frente.findMany({
      where: { workspaceId, ativa: true },
      orderBy: { ordem: 'asc' },
    }),
    prisma.compromissoFixo.findMany({ where: { workspaceId } }),
  ]);

  if (!workspace) throw new Error('Workspace não encontrado');
  if (frentes.length === 0) throw new Error('Crie ao menos uma frente primeiro');

  const frenteNome = new Map(frentes.map((f) => [f.id, f.nome]));

  // Semanas de histórico (as N anteriores à semana-alvo).
  const isosHistorico = Array.from({ length: semanasHistorico }, (_, i) =>
    shiftIsoWeek(semanaIsoAlvo, -(i + 1)),
  ).reverse();

  const semanas = await prisma.semanaPlano.findMany({
    where: { workspaceId, semanaIso: { in: isosHistorico } },
    include: {
      blocos: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
      revisao: true,
    },
  });
  const semanaPorIso = new Map(semanas.map((s) => [s.semanaIso, s]));

  const fechamentos = await prisma.fechamentoDia.findMany({
    where: { workspaceId },
    orderBy: { data: 'desc' },
    take: 14,
  });

  // ---- Monta o texto do histórico pro modelo ----
  const linhasHistorico = isosHistorico.map((iso) => {
    const s = semanaPorIso.get(iso);
    if (!s || s.blocos.length === 0) {
      return `Semana ${iso} (${isoWeekRangeLabel(iso)}): sem dados.`;
    }
    const blocos = s.blocos
      .map((b) => {
        const fr = frenteNome.get(b.frenteId) ?? '?';
        const realizado =
          b.categoriaRealizada === b.categoriaPlanejada
            ? 'fez'
            : `virou ${b.categoriaRealizada}`;
        const prio = b.prioridadeSemana ? ` [prioridade ${b.prioridadeSemana}]` : '';
        return `  ${diaLabel(b.diaSemana)} ${b.horaInicio}-${b.horaFim} ${fr}: ${b.tarefa} (plan: ${b.categoriaPlanejada}, real: ${realizado})${sufixoHorarioReal(b)}${prio}`;
      })
      .join('\n');
    const rev = s.revisao
      ? `\n  Revisão: funcionou="${s.revisao.retroFuncionou ?? '-'}" | não funcionou="${s.revisao.retroNaoFuncionou ?? '-'}" | mudança="${s.revisao.retroMudanca ?? '-'}" | sensação=${s.revisao.sensacaoMedia ?? '-'}/5`
      : '';
    return `Semana ${iso} (${isoWeekRangeLabel(iso)}):\n${blocos}${rev}`;
  });

  const linhasFechamento = fechamentos.length
    ? fechamentos
        .map(
          (f) =>
            `  ${f.data}: nota ${f.nota ?? '-'}/5 | bom="${f.destaque ?? '-'}" | melhorar="${f.aprendizado ?? '-'}"`,
        )
        .join('\n')
    : '  (sem fechamentos registrados)';

  const linhasFrentes = frentes
    .map((f) => `  - ${f.nome} (id: ${f.id}) — orçamento ${f.orcamentoHoras}h/semana`)
    .join('\n');

  const linhasCompromissos = compromissos.length
    ? compromissos
        .map(
          (c) =>
            `  ${diaLabel(c.diaSemana)} ${c.horaInicio}-${c.horaFim}: ${c.descricao}${c.frenteId ? ` (frente ${frenteNome.get(c.frenteId) ?? '?'})` : ''}`,
        )
        .join('\n')
    : '  (nenhum)';

  const system = [
    'Você é o planejador da "Bússola do Tempo", um app de gestão de tempo que cruza Frentes de trabalho × categorias (IMPORTANTE/URGENTE/DISPERSO).',
    'Sua tarefa: propor a agenda da próxima semana aprendendo com o histórico real do usuário.',
    'Regras:',
    `- Respeite a janela do dia: acorda ${workspace.horaAcordar}, dorme ${workspace.horaDormir}; almoço ${workspace.horaAlmocoIni}-${workspace.horaAlmocoFim} (não agende em cima do almoço).`,
    '- Mantenha os compromissos fixos nos horários deles.',
    '- Distribua o tempo de cada frente perto do orçamento de horas dela.',
    '- Baseie-se FORTEMENTE no que REALMENTE aconteceu (categoriaRealizada), não só no que foi planejado. O que repetiu em várias semanas provavelmente repete — proponha de novo (é assim que a recorrência emerge).',
    '- Se um tipo de trabalho sempre vira DISPERSO ou URGENTE em certo horário, evite colocar trabalho IMPORTANTE ali; proteja os horários que historicamente funcionam.',
    '- "[real HH:mm-HH:mm]" num bloco = ele foi EXECUTADO fora do horário planejado. Se um bloco/horário sempre desliza (ex.: planejado de manhã mas sempre feito à tarde), proponha já no horário real que costuma funcionar.',
    '- Leve em conta as reflexões e fechamentos (o que o usuário disse que funcionou/atrapalhou).',
    '- Fins de semana (Sáb/Dom): deixe livres, a menos que o histórico mostre trabalho recorrente neles.',
    '- Com pouco histórico, seja conservador: gere a partir dos orçamentos e compromissos e não invente uma semana lotada.',
    '- Use APENAS os IDs de frente fornecidos. Horários no formato HH:mm (24h). Blocos sem sobreposição.',
    '- Gere uma semana realista (não lote o dia inteiro).',
    '- Insights: 2 a 4, cada um citando um padrão CONCRETO do histórico (ex: "Doctum vira disperso depois das 17h em 3 das 4 semanas"). Nada genérico.',
    'Responda SOMENTE chamando a ferramenta propor_agenda.',
  ].join('\n');

  const userMsg = [
    `Semana-alvo: ${semanaIsoAlvo} (${isoWeekRangeLabel(semanaIsoAlvo)}).`,
    '',
    'FRENTES (use estes IDs):',
    linhasFrentes,
    '',
    'COMPROMISSOS FIXOS (mantenha):',
    linhasCompromissos,
    '',
    'HISTÓRICO (planejado × realizado):',
    ...linhasHistorico,
    '',
    'FECHAMENTOS RECENTES:',
    linhasFechamento,
    '',
    'Proponha a agenda da semana-alvo.',
  ].join('\n');

  const idsFrentes = frentes.map((f) => f.id);

  const client = criarClienteIA(apiKey);
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 8000,
    system,
    messages: [{ role: 'user', content: userMsg }],
    tools: [
      {
        name: 'propor_agenda',
        description: 'Devolve a proposta de agenda da semana, com resumo e insights.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            resumo: { type: 'string', description: 'Resumo curto da lógica da proposta.' },
            insights: {
              type: 'array',
              items: { type: 'string' },
              description: '2 a 4 insights acionáveis tirados do histórico.',
            },
            blocos: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  diaSemana: { type: 'string', enum: diaSemanaValues as unknown as string[] },
                  horaInicio: { type: 'string', description: 'HH:mm' },
                  horaFim: { type: 'string', description: 'HH:mm' },
                  tarefa: { type: 'string' },
                  frenteId: { type: 'string', enum: idsFrentes },
                  categoriaPlanejada: {
                    type: 'string',
                    enum: categoriaValues as unknown as string[],
                  },
                },
                required: [
                  'diaSemana',
                  'horaInicio',
                  'horaFim',
                  'tarefa',
                  'frenteId',
                  'categoriaPlanejada',
                ],
              },
            },
          },
          required: ['resumo', 'insights', 'blocos'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'propor_agenda' },
  });

  const bloco = response.content.find((b) => b.type === 'tool_use');
  if (!bloco || bloco.type !== 'tool_use') {
    throw new Error('A IA não devolveu uma proposta.');
  }
  const proposta = bloco.input as PropostaAgenda;

  // Defesa: filtra blocos com frente/horário inválidos.
  const idSet = new Set(idsFrentes);
  const horaOk = (h: string) => /^\d{2}:\d{2}$/.test(h);
  proposta.blocos = (proposta.blocos ?? []).filter(
    (b) =>
      idSet.has(b.frenteId) &&
      horaOk(b.horaInicio) &&
      horaOk(b.horaFim) &&
      b.horaFim > b.horaInicio &&
      diaSemanaValues.includes(b.diaSemana) &&
      categoriaValues.includes(b.categoriaPlanejada),
  );
  proposta.insights = proposta.insights ?? [];
  proposta.resumo = proposta.resumo ?? '';

  // Cold start: quantas semanas de histórico realmente tinham blocos.
  const semanasComDados = semanas.filter((s) => s.blocos.length > 0).length;
  proposta.semanasComDados = semanasComDados;
  proposta.poucoHistorico = semanasComDados < 2;

  return proposta;
}

/**
 * Analisa UMA semana (planejado × realizado + reflexões) e devolve insights
 * acionáveis. Usado na Revisão semanal.
 */
export async function gerarInsightsSemana(
  workspaceId: string,
  semanaIso: string,
): Promise<{ insights: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SemChaveIA();

  const [frentes, semana] = await Promise.all([
    prisma.frente.findMany({ where: { workspaceId }, orderBy: { ordem: 'asc' } }),
    prisma.semanaPlano.findUnique({
      where: { workspaceId_semanaIso: { workspaceId, semanaIso } },
      include: {
        blocos: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
        revisao: true,
      },
    }),
  ]);

  if (!semana || semana.blocos.length === 0) {
    return { insights: [] };
  }
  const frenteNome = new Map(frentes.map((f) => [f.id, f.nome]));

  const linhas = semana.blocos
    .map((b) => {
      const fr = frenteNome.get(b.frenteId) ?? '?';
      const real =
        b.categoriaRealizada === b.categoriaPlanejada ? 'fez' : `virou ${b.categoriaRealizada}`;
      return `  ${diaLabel(b.diaSemana)} ${b.horaInicio}-${b.horaFim} ${fr}: ${b.tarefa} (plan: ${b.categoriaPlanejada}, real: ${real})${sufixoHorarioReal(b)}`;
    })
    .join('\n');
  const rev = semana.revisao
    ? `Reflexão: funcionou="${semana.revisao.retroFuncionou ?? '-'}" | não funcionou="${semana.revisao.retroNaoFuncionou ?? '-'}" | mudança="${semana.revisao.retroMudanca ?? '-'}" | sensação=${semana.revisao.sensacaoMedia ?? '-'}/5`
    : 'Sem reflexão escrita.';

  const client = criarClienteIA(apiKey);
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 1500,
    system:
      'Você analisa a semana de um usuário da Bússola do Tempo (planejado × realizado por Frente × categoria IMPORTANTE/URGENTE/DISPERSO). Dê 3 a 5 insights curtos e ACIONÁVEIS, cada um citando um padrão concreto da semana (não genérico). Foque no que atrapalhou e no que dá pra ajustar. Responda SOMENTE chamando dar_insights.',
    messages: [
      {
        role: 'user',
        content: `Semana ${semanaIso} (${isoWeekRangeLabel(semanaIso)}):\n${linhas}\n${rev}\n\nDê os insights.`,
      },
    ],
    tools: [
      {
        name: 'dar_insights',
        description: 'Devolve os insights acionáveis da semana.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            insights: { type: 'array', items: { type: 'string' } },
          },
          required: ['insights'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'dar_insights' },
  });

  const bloco = response.content.find((b) => b.type === 'tool_use');
  if (!bloco || bloco.type !== 'tool_use') return { insights: [] };
  const out = bloco.input as { insights?: string[] };
  return { insights: (out.insights ?? []).filter((s) => typeof s === 'string' && s.trim()) };
}

export type RevisarPlanejar = {
  /** Insights sobre a semana que passou (retrospecto). */
  analise: string[];
  /** Proposta de agenda da PRÓXIMA semana. */
  proposta: PropostaAgenda;
  proximaIso: string;
};

/**
 * Comando combinado do ritual semanal: numa única chamada de IA, analisa a
 * semana que passou E propõe a próxima (aprendendo do retrospecto + histórico).
 */
export async function revisarEPlanejar(
  workspaceId: string,
  semanaIsoRevisada: string,
  semanasHistorico = 4,
): Promise<RevisarPlanejar> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SemChaveIA();

  const proximaIso = shiftIsoWeek(semanaIsoRevisada, 1);

  const [workspace, frentes, compromissos] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.frente.findMany({ where: { workspaceId, ativa: true }, orderBy: { ordem: 'asc' } }),
    prisma.compromissoFixo.findMany({ where: { workspaceId } }),
  ]);
  if (!workspace) throw new Error('Workspace não encontrado');
  if (frentes.length === 0) throw new Error('Crie ao menos uma frente primeiro');
  const frenteNome = new Map(frentes.map((f) => [f.id, f.nome]));

  // Histórico = a semana revisada + as anteriores (termina na revisada).
  const isosHistorico = Array.from({ length: semanasHistorico }, (_, i) =>
    shiftIsoWeek(semanaIsoRevisada, -i),
  ).reverse();

  const semanas = await prisma.semanaPlano.findMany({
    where: { workspaceId, semanaIso: { in: isosHistorico } },
    include: {
      blocos: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
      revisao: true,
    },
  });
  const semanaPorIso = new Map(semanas.map((s) => [s.semanaIso, s]));
  const fechamentos = await prisma.fechamentoDia.findMany({
    where: { workspaceId },
    orderBy: { data: 'desc' },
    take: 14,
  });

  const linhasHistorico = isosHistorico.map((iso) => {
    const s = semanaPorIso.get(iso);
    const marca = iso === semanaIsoRevisada ? ' ← SEMANA A REVISAR' : '';
    if (!s || s.blocos.length === 0) return `Semana ${iso}${marca}: sem dados.`;
    const blocos = s.blocos
      .map((b) => {
        const fr = frenteNome.get(b.frenteId) ?? '?';
        const real =
          b.categoriaRealizada === b.categoriaPlanejada ? 'fez' : `virou ${b.categoriaRealizada}`;
        return `  ${diaLabel(b.diaSemana)} ${b.horaInicio}-${b.horaFim} ${fr}: ${b.tarefa} (plan: ${b.categoriaPlanejada}, real: ${real})${sufixoHorarioReal(b)}`;
      })
      .join('\n');
    const rev = s.revisao
      ? `\n  Reflexão: funcionou="${s.revisao.retroFuncionou ?? '-'}" | não="${s.revisao.retroNaoFuncionou ?? '-'}" | mudar="${s.revisao.retroMudanca ?? '-'}" | sensação=${s.revisao.sensacaoMedia ?? '-'}/5`
      : '';
    return `Semana ${iso}${marca}:\n${blocos}${rev}`;
  });

  const linhasFrentes = frentes
    .map((f) => `  - ${f.nome} (id: ${f.id}) — orçamento ${f.orcamentoHoras}h/semana`)
    .join('\n');
  const linhasCompromissos = compromissos.length
    ? compromissos
        .map((c) => `  ${diaLabel(c.diaSemana)} ${c.horaInicio}-${c.horaFim}: ${c.descricao}`)
        .join('\n')
    : '  (nenhum)';
  const linhasFechamento = fechamentos.length
    ? fechamentos
        .map((f) => `  ${f.data}: nota ${f.nota ?? '-'}/5 | bom="${f.destaque ?? '-'}" | melhorar="${f.aprendizado ?? '-'}"`)
        .join('\n')
    : '  (sem fechamentos)';

  const idsFrentes = frentes.map((f) => f.id);

  const system = [
    'Você é o assistente da "Bússola do Tempo" (Frentes × IMPORTANTE/URGENTE/DISPERSO). É o ritual semanal: você faz DUAS coisas numa tacada.',
    `1) ANÁLISE da semana ${semanaIsoRevisada} (a que passou): 3-5 insights curtos e ACIONÁVEIS, cada um citando um padrão concreto (planejado × realizado, reflexões). Nada genérico.`,
    `2) PROPOSTA da semana ${proximaIso} (a próxima), aprendendo da análise e do histórico.`,
    'Regras da proposta:',
    `- Janela: acorda ${workspace.horaAcordar}, dorme ${workspace.horaDormir}; almoço ${workspace.horaAlmocoIni}-${workspace.horaAlmocoFim} (livre).`,
    '- Mantenha compromissos fixos. Distribua perto do orçamento de cada frente.',
    '- Baseie-se no REALIZADO (o que repete, repete). Proteja horários que funcionam; evite IMPORTANTE em horário que vira DISPERSO/URGENTE.',
    '- Fins de semana livres salvo histórico. Pouco histórico = conservador. Use só os IDs de frente dados. HH:mm 24h. Sem sobreposição.',
    'Responda SOMENTE chamando revisar_e_planejar.',
  ].join('\n');

  const userMsg = [
    'FRENTES (use estes IDs):',
    linhasFrentes,
    '',
    'COMPROMISSOS FIXOS:',
    linhasCompromissos,
    '',
    'HISTÓRICO (a semana a revisar está marcada):',
    ...linhasHistorico,
    '',
    'FECHAMENTOS RECENTES:',
    linhasFechamento,
    '',
    `Analise a semana ${semanaIsoRevisada} e proponha a ${proximaIso}.`,
  ].join('\n');

  const client = criarClienteIA(apiKey);
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 8000,
    system,
    messages: [{ role: 'user', content: userMsg }],
    tools: [
      {
        name: 'revisar_e_planejar',
        description: 'Devolve a análise da semana que passou e a proposta da próxima.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            analise: { type: 'array', items: { type: 'string' } },
            resumoProxima: { type: 'string' },
            blocosProxima: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  diaSemana: { type: 'string', enum: diaSemanaValues as unknown as string[] },
                  horaInicio: { type: 'string' },
                  horaFim: { type: 'string' },
                  tarefa: { type: 'string' },
                  frenteId: { type: 'string', enum: idsFrentes },
                  categoriaPlanejada: { type: 'string', enum: categoriaValues as unknown as string[] },
                },
                required: ['diaSemana', 'horaInicio', 'horaFim', 'tarefa', 'frenteId', 'categoriaPlanejada'],
              },
            },
          },
          required: ['analise', 'resumoProxima', 'blocosProxima'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'revisar_e_planejar' },
  });

  const bloco = response.content.find((b) => b.type === 'tool_use');
  if (!bloco || bloco.type !== 'tool_use') throw new Error('A IA não devolveu o resultado.');
  const out = bloco.input as {
    analise?: string[];
    resumoProxima?: string;
    blocosProxima?: PropostaBloco[];
  };

  const idSet = new Set(idsFrentes);
  const horaOk = (h: string) => /^\d{2}:\d{2}$/.test(h);
  const blocos = (out.blocosProxima ?? []).filter(
    (b) =>
      idSet.has(b.frenteId) &&
      horaOk(b.horaInicio) &&
      horaOk(b.horaFim) &&
      b.horaFim > b.horaInicio &&
      diaSemanaValues.includes(b.diaSemana) &&
      categoriaValues.includes(b.categoriaPlanejada),
  );
  const semanasComDados = semanas.filter((s) => s.blocos.length > 0).length;

  return {
    analise: (out.analise ?? []).filter((s) => typeof s === 'string' && s.trim()),
    proposta: {
      resumo: out.resumoProxima ?? '',
      insights: [],
      blocos,
      semanasComDados,
      poucoHistorico: semanasComDados < 2,
    },
    proximaIso,
  };
}

// ---- Cache do ritual (guarda o resultado da IA; ver de novo é grátis) ----
// Reaproveita o modelo Insight (que não é escrito em nenhum outro lugar).
const CACHE_TITULO = 'ritual-ia';

export async function lerRitualCache(
  workspaceId: string,
  semanaIso: string,
): Promise<RevisarPlanejar | null> {
  const semana = await prisma.semanaPlano.findUnique({
    where: { workspaceId_semanaIso: { workspaceId, semanaIso } },
    select: { id: true },
  });
  if (!semana) return null;
  const row = await prisma.insight.findFirst({
    where: { semanaPlanoId: semana.id, titulo: CACHE_TITULO },
    orderBy: { geradoEm: 'desc' },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.texto) as RevisarPlanejar;
  } catch {
    return null;
  }
}

async function salvarRitualCache(
  workspaceId: string,
  semanaIso: string,
  result: RevisarPlanejar,
): Promise<void> {
  // Garante a SemanaPlano (cria vazia se faltar) pra o cache NUNCA deixar de
  // persistir — senão uma geração paga não fica guardada e a retentativa recobra.
  const semana = await prisma.semanaPlano.upsert({
    where: { workspaceId_semanaIso: { workspaceId, semanaIso } },
    create: { workspaceId, semanaIso },
    update: {},
    select: { id: true },
  });
  await prisma.insight.deleteMany({
    where: { semanaPlanoId: semana.id, titulo: CACHE_TITULO },
  });
  await prisma.insight.create({
    data: { semanaPlanoId: semana.id, tipo: 'NEUTRAL', titulo: CACHE_TITULO, texto: JSON.stringify(result) },
  });
}

/**
 * Comando combinado COM cache: se já existe resultado guardado e `force` é
 * falso, devolve o cache (grátis, sem chamar a IA). Senão gera e guarda.
 */
export async function revisarEPlanejarComCache(
  workspaceId: string,
  semanaIso: string,
  force = false,
): Promise<RevisarPlanejar & { cacheado: boolean }> {
  if (!force) {
    const cache = await lerRitualCache(workspaceId, semanaIso);
    if (cache) return { ...cache, cacheado: true };
  }
  const result = await revisarEPlanejar(workspaceId, semanaIso);
  await salvarRitualCache(workspaceId, semanaIso, result);
  return { ...result, cacheado: false };
}
