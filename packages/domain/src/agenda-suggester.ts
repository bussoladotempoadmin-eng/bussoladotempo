/**
 * AgendaSuggester — gera a "agenda padrão" (blocos genéricos) a partir das
 * frentes, compromissos fixos e configurações de janela do workspace.
 *
 * Implementa a lógica da §9.1 da spec (docs/02-spec-tecnica/arquitetura.md).
 * Heurística V1 — determinística e testável, sem dependência de banco.
 */

export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';
export type Categoria = 'IMPORTANTE' | 'URGENTE' | 'DISPERSO';

export interface FrenteInput {
  id: string;
  orcamentoHoras: number;
  ordem: number;
}

export interface CompromissoInput {
  diaSemana: DiaSemana;
  horaInicio: string; // "HH:mm"
  horaFim: string; // "HH:mm"
  frenteId?: string | null;
  categoria?: Categoria;
}

export interface WorkspaceInput {
  horaAcordar: string;
  horaDormir: string;
  horaAlmocoIni: string;
  horaAlmocoFim: string;
  semanaInicio?: 'DOMINGO' | 'SEGUNDA';
}

export interface BlocoSugerido {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  frenteId: string;
  tarefa: string;
  categoriaPlanejada: Categoria;
}

export interface AvisoCapacidade {
  excedeu: boolean;
  horasOrcadas: number;
  horasAlocadas: number;
  horasFaltando: number;
}

export interface AgendaSuggestion {
  blocos: BlocoSugerido[];
  avisoCapacidade: AvisoCapacidade;
}

export interface SuggesterInput {
  frentes: FrenteInput[];
  compromissosFixos: CompromissoInput[];
  workspace: WorkspaceInput;
}

export interface SuggesterOptions {
  /** Dias em que a agenda padrão distribui blocos. Default: SEG–SEX. */
  diasUteis?: DiaSemana[];
  /** Tamanho mínimo de um bloco, em minutos. Default: 30. */
  blocoMinimoMin?: number;
}

interface Interval {
  start: number; // minutos desde 00:00
  end: number;
}

const DIAS_UTEIS_PADRAO: DiaSemana[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
const TAREFA_PADRAO = 'Bloco genérico';

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Remove o intervalo [busyStart, busyEnd) de uma lista de intervalos livres. */
function subtractBusy(intervals: Interval[], busyStart: number, busyEnd: number): Interval[] {
  const out: Interval[] = [];
  for (const intv of intervals) {
    // sem sobreposição
    if (busyEnd <= intv.start || busyStart >= intv.end) {
      out.push(intv);
      continue;
    }
    // pedaço antes do compromisso
    if (busyStart > intv.start) out.push({ start: intv.start, end: Math.min(busyStart, intv.end) });
    // pedaço depois do compromisso
    if (busyEnd < intv.end) out.push({ start: Math.max(busyEnd, intv.start), end: intv.end });
  }
  return out.filter((i) => i.end > i.start);
}

/** Junta blocos contíguos da mesma frente no mesmo dia (saída mais limpa). */
function mergeContiguos(blocos: BlocoSugerido[]): BlocoSugerido[] {
  const ordenados = [...blocos].sort((a, b) => {
    if (a.diaSemana !== b.diaSemana) return 0;
    return toMin(a.horaInicio) - toMin(b.horaInicio);
  });
  const out: BlocoSugerido[] = [];
  for (const b of ordenados) {
    const ult = out[out.length - 1];
    if (
      ult &&
      ult.diaSemana === b.diaSemana &&
      ult.frenteId === b.frenteId &&
      ult.horaFim === b.horaInicio
    ) {
      ult.horaFim = b.horaFim;
    } else {
      out.push({ ...b });
    }
  }
  return out;
}

export function suggestAgenda(
  input: SuggesterInput,
  options: SuggesterOptions = {},
): AgendaSuggestion {
  const diasUteis = options.diasUteis ?? DIAS_UTEIS_PADRAO;
  const minBloco = options.blocoMinimoMin ?? 30;
  const { frentes, compromissosFixos, workspace } = input;

  const acordar = toMin(workspace.horaAcordar);
  const dormir = toMin(workspace.horaDormir);
  const almocoIni = toMin(workspace.horaAlmocoIni);
  const almocoFim = toMin(workspace.horaAlmocoFim);

  // Janelas base (§9.1 passo 1): manhã pós-acordar+1h, tarde até dormir-30min.
  const janelaManha: Interval = { start: acordar + 60, end: almocoIni };
  const janelaTarde: Interval = { start: almocoFim, end: dormir - 30 };
  const janelasBase = [janelaManha, janelaTarde].filter((j) => j.end > j.start);

  // Intervalos livres por dia, já subtraindo compromissos fixos (passo 2).
  const freeByDia = new Map<DiaSemana, Interval[]>();
  for (const dia of diasUteis) {
    let intervals: Interval[] = janelasBase.map((j) => ({ ...j }));
    for (const c of compromissosFixos.filter((x) => x.diaSemana === dia)) {
      intervals = subtractBusy(intervals, toMin(c.horaInicio), toMin(c.horaFim));
    }
    // ordem ascendente => manhã antes da tarde (preferência por deep work).
    freeByDia.set(dia, intervals.sort((a, b) => a.start - b.start));
  }

  // Frentes por prioridade (ordem asc), ignorando as de 0h (passo 3 + borda).
  const frentesOrdenadas = frentes
    .filter((f) => f.orcamentoHoras > 0)
    .sort((a, b) => a.ordem - b.ordem);

  const blocos: BlocoSugerido[] = [];
  let horasOrcadas = 0;
  let minutosAlocados = 0;

  // Consome até `maxMin` minutos dos intervalos livres de um dia para a frente.
  function alocarNoDia(dia: DiaSemana, frenteId: string, maxMin: number): number {
    let restante = maxMin;
    let alocado = 0;
    for (const intv of freeByDia.get(dia)!) {
      if (restante < minBloco) break;
      const livre = intv.end - intv.start;
      if (livre < minBloco) continue;
      const take = Math.min(livre, restante);
      blocos.push({
        diaSemana: dia,
        horaInicio: toHHMM(intv.start),
        horaFim: toHHMM(intv.start + take),
        frenteId,
        tarefa: TAREFA_PADRAO,
        categoriaPlanejada: 'IMPORTANTE',
      });
      intv.start += take; // encolhe o intervalo consumido
      restante -= take;
      alocado += take;
    }
    minutosAlocados += alocado;
    return alocado;
  }

  for (const frente of frentesOrdenadas) {
    horasOrcadas += frente.orcamentoHoras;
    let restante = Math.round(frente.orcamentoHoras * 60);
    const alvoPorDia = restante / diasUteis.length;

    // Passo A — distribuição uniforme (espalha entre os dias).
    for (const dia of diasUteis) {
      if (restante < minBloco) break;
      restante -= alocarNoDia(dia, frente.id, Math.min(Math.round(alvoPorDia), restante));
    }
    // Passo B — preenche o que sobrou do orçamento onde ainda houver espaço.
    for (const dia of diasUteis) {
      if (restante < minBloco) break;
      restante -= alocarNoDia(dia, frente.id, restante);
    }
  }

  const merged = mergeContiguos(blocos);
  const horasAlocadas = minutosAlocados / 60;
  const horasFaltando = Math.max(0, horasOrcadas - horasAlocadas);

  return {
    blocos: merged,
    avisoCapacidade: {
      excedeu: horasFaltando > 0.001,
      horasOrcadas: Number(horasOrcadas.toFixed(2)),
      horasAlocadas: Number(horasAlocadas.toFixed(2)),
      horasFaltando: Number(horasFaltando.toFixed(2)),
    },
  };
}
