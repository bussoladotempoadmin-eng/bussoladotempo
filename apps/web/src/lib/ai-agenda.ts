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
        return `  ${diaLabel(b.diaSemana)} ${b.horaInicio}-${b.horaFim} ${fr}: ${b.tarefa} (plan: ${b.categoriaPlanejada}, real: ${realizado})${prio}`;
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
    '- Aprenda com o padrão planejado × realizado: se um tipo de trabalho sempre vira DISPERSO ou URGENTE em certo horário, evite colocar trabalho IMPORTANTE ali; proteja os horários que funcionam.',
    '- Leve em conta as reflexões e fechamentos (o que o usuário disse que funcionou/atrapalhou).',
    '- Use APENAS os IDs de frente fornecidos. Horários no formato HH:mm (24h). Blocos sem sobreposição.',
    '- Gere uma semana realista (não lote o dia inteiro). Devolva também um resumo curto e 2-4 insights acionáveis.',
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

  const client = new Anthropic({ apiKey });
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

  return proposta;
}
