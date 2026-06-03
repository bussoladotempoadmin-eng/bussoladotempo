import { describe, it, expect } from 'vitest';
import {
  suggestAgenda,
  type SuggesterInput,
  type BlocoSugerido,
  type CompromissoInput,
  type WorkspaceInput,
} from './agenda-suggester';

const workspaceLucas: WorkspaceInput = {
  horaAcordar: '06:00',
  horaDormir: '22:30',
  horaAlmocoIni: '12:00',
  horaAlmocoFim: '13:30',
  semanaInicio: 'SEGUNDA',
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function duracaoHoras(b: BlocoSugerido): number {
  return (toMin(b.horaFim) - toMin(b.horaInicio)) / 60;
}

/** Verifica que nenhum par de blocos no mesmo dia se sobrepõe. */
function semSobreposicao(blocos: BlocoSugerido[]): boolean {
  for (const dia of new Set(blocos.map((b) => b.diaSemana))) {
    const doDia = blocos
      .filter((b) => b.diaSemana === dia)
      .sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio));
    for (let i = 1; i < doDia.length; i++) {
      if (toMin(doDia[i].horaInicio) < toMin(doDia[i - 1].horaFim)) return false;
    }
  }
  return true;
}

/** Verifica que nenhum bloco invade um compromisso fixo. */
function naoInvadeCompromissos(blocos: BlocoSugerido[], comps: CompromissoInput[]): boolean {
  return blocos.every((b) =>
    comps
      .filter((c) => c.diaSemana === b.diaSemana)
      .every(
        (c) =>
          toMin(b.horaFim) <= toMin(c.horaInicio) || toMin(b.horaInicio) >= toMin(c.horaFim),
      ),
  );
}

describe('AgendaSuggester', () => {
  it('caso Lucas: 4 frentes, 59h, 2 compromissos noturnos', () => {
    const compromissos: CompromissoInput[] = [
      { diaSemana: 'SEG', horaInicio: '07:00', horaFim: '08:00', categoria: 'IMPORTANTE' },
      { diaSemana: 'TER', horaInicio: '07:00', horaFim: '08:00', categoria: 'IMPORTANTE' },
      { diaSemana: 'QUA', horaInicio: '07:00', horaFim: '08:00', categoria: 'IMPORTANTE' },
      { diaSemana: 'QUI', horaInicio: '07:00', horaFim: '08:00', categoria: 'IMPORTANTE' },
      { diaSemana: 'SEX', horaInicio: '07:00', horaFim: '08:00', categoria: 'IMPORTANTE' },
      { diaSemana: 'SEG', horaInicio: '18:30', horaFim: '21:30', frenteId: 't', categoria: 'IMPORTANTE' },
      { diaSemana: 'QUI', horaInicio: '18:00', horaFim: '21:00', frenteId: 't', categoria: 'IMPORTANTE' },
    ];
    const input: SuggesterInput = {
      frentes: [
        { id: 'doctum', orcamentoHoras: 36, ordem: 0 },
        { id: 't', orcamentoHoras: 18, ordem: 1 },
        { id: 'bruna', orcamentoHoras: 2.5, ordem: 2 },
        { id: 'cuidaja', orcamentoHoras: 2.5, ordem: 3 },
      ],
      compromissosFixos: compromissos,
      workspace: workspaceLucas,
    };

    const { blocos, avisoCapacidade } = suggestAgenda(input);

    expect(blocos.length).toBeGreaterThan(0);
    expect(semSobreposicao(blocos)).toBe(true);
    expect(naoInvadeCompromissos(blocos, compromissos)).toBe(true);
    // Todos os blocos dentro da janela acordada (07:00–22:00).
    for (const b of blocos) {
      expect(toMin(b.horaInicio)).toBeGreaterThanOrEqual(toMin('07:00'));
      expect(toMin(b.horaFim)).toBeLessThanOrEqual(toMin('22:00'));
      expect(b.categoriaPlanejada).toBe('IMPORTANTE');
      expect(b.tarefa).toBe('Bloco genérico');
    }
    // Capacidade SEG–SEX (~56,5h) é menor que 59h orçadas → deve avisar.
    expect(avisoCapacidade.excedeu).toBe(true);
    expect(avisoCapacidade.horasAlocadas).toBeLessThanOrEqual(59);
    expect(avisoCapacidade.horasAlocadas).toBeGreaterThan(50);
  });

  it('caso single frente 40h: distribui nos 5 dias úteis', () => {
    const input: SuggesterInput = {
      frentes: [{ id: 'unica', orcamentoHoras: 40, ordem: 0 }],
      compromissosFixos: [],
      workspace: workspaceLucas,
    };
    const { blocos, avisoCapacidade } = suggestAgenda(input);

    const dias = new Set(blocos.map((b) => b.diaSemana));
    expect([...dias].sort()).toEqual(['QUA', 'QUI', 'SEG', 'SEX', 'TER'].sort());
    expect(avisoCapacidade.excedeu).toBe(false);
    expect(avisoCapacidade.horasAlocadas).toBeCloseTo(40, 1);
    expect(semSobreposicao(blocos)).toBe(true);
  });

  it('caso 0 frentes: array vazio', () => {
    const input: SuggesterInput = {
      frentes: [],
      compromissosFixos: [],
      workspace: workspaceLucas,
    };
    const { blocos, avisoCapacidade } = suggestAgenda(input);
    expect(blocos).toEqual([]);
    expect(avisoCapacidade.horasAlocadas).toBe(0);
    expect(avisoCapacidade.excedeu).toBe(false);
  });

  it('caso compromisso cobre o dia inteiro: não gera blocos naquele dia', () => {
    const compromissos: CompromissoInput[] = [
      { diaSemana: 'SEG', horaInicio: '06:00', horaFim: '23:00', categoria: 'URGENTE' },
    ];
    const input: SuggesterInput = {
      frentes: [{ id: 'unica', orcamentoHoras: 10, ordem: 0 }],
      compromissosFixos: compromissos,
      workspace: workspaceLucas,
    };
    const { blocos } = suggestAgenda(input);

    expect(blocos.some((b) => b.diaSemana === 'SEG')).toBe(false);
    expect(blocos.length).toBeGreaterThan(0); // gera nos outros dias
    expect(naoInvadeCompromissos(blocos, compromissos)).toBe(true);
    expect(semSobreposicao(blocos)).toBe(true);
  });

  it('frente com 0h não gera blocos', () => {
    const input: SuggesterInput = {
      frentes: [
        { id: 'ativa', orcamentoHoras: 10, ordem: 0 },
        { id: 'zerada', orcamentoHoras: 0, ordem: 1 },
      ],
      compromissosFixos: [],
      workspace: workspaceLucas,
    };
    const { blocos } = suggestAgenda(input);
    expect(blocos.some((b) => b.frenteId === 'zerada')).toBe(false);
    expect(blocos.some((b) => b.frenteId === 'ativa')).toBe(true);
  });

  it('respeita a preferência por manhãs (frente prioritária pega cedo)', () => {
    const input: SuggesterInput = {
      frentes: [{ id: 'p', orcamentoHoras: 5, ordem: 0 }],
      compromissosFixos: [],
      workspace: workspaceLucas,
    };
    const { blocos } = suggestAgenda(input);
    // Com 5h/5dias = 1h/dia, cada dia deve começar pela manhã (07:00).
    const seg = blocos.filter((b) => b.diaSemana === 'SEG');
    expect(seg[0]?.horaInicio).toBe('07:00');
  });
});
