import { describe, it, expect } from 'vitest';
import { calcEspelho, type BlocoEspelho, type FrenteRef } from './espelho-calculator';
import { gerarInsights, type FrenteInsight } from './insight-engine';

const frentesRef: FrenteRef[] = [{ id: 'doctum' }, { id: 'tribo' }];
const frentesInfo: FrenteInsight[] = [
  { id: 'doctum', nome: 'Doctum', icone: '🏢' },
  { id: 'tribo', nome: 'Tribo', icone: '🛒' },
];

function bloco(p: Partial<BlocoEspelho>): BlocoEspelho {
  return {
    frenteId: 'doctum',
    horaInicio: '08:00',
    horaFim: '12:00',
    categoriaPlanejada: 'IMPORTANTE',
    categoriaRealizada: 'IMPORTANTE',
    ...p,
  };
}

function insights(blocos: BlocoEspelho[]) {
  return gerarInsights(calcEspelho(blocos, frentesRef), frentesInfo);
}

describe('InsightEngine', () => {
  it('semana vazia: retorna um insight NEUTRAL', () => {
    const r = gerarInsights(calcEspelho([], frentesRef), frentesInfo);
    expect(r).toHaveLength(1);
    expect(r[0].tipo).toBe('NEUTRAL');
  });

  it('muito Importante: gera insight GOOD imp_alto', () => {
    const r = insights([
      bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'IMPORTANTE' }),
      bloco({ horaInicio: '13:00', horaFim: '17:00', categoriaRealizada: 'IMPORTANTE' }),
    ]);
    expect(r.some((i) => i.tipo === 'GOOD' && i.titulo.includes('Importante'))).toBe(true);
  });

  it('muito Urgente: gera alerta de bombeiro', () => {
    const r = insights([
      bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'URGENTE' }),
      bloco({ horaInicio: '13:00', horaFim: '17:00', categoriaRealizada: 'URGENTE' }),
    ]);
    expect(r.some((i) => i.tipo === 'WARN' && i.titulo.includes('bombeiro'))).toBe(true);
  });

  it('muito Disperso: gera alerta de disperso alto', () => {
    const r = insights([
      bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'IMPORTANTE' }),
      bloco({ horaInicio: '13:00', horaFim: '17:00', categoriaRealizada: 'DISPERSO' }),
    ]);
    expect(r.some((i) => i.titulo.includes('Disperso'))).toBe(true);
  });

  it('frente reativa: gera insight por frente vinculado à frente certa', () => {
    const r = insights([
      // doctum quase todo urgente
      bloco({ frenteId: 'doctum', horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'URGENTE' }),
      bloco({ frenteId: 'doctum', horaInicio: '13:00', horaFim: '17:00', categoriaRealizada: 'URGENTE' }),
      // tribo protegida
      bloco({ frenteId: 'tribo', horaInicio: '08:00', horaFim: '11:00', categoriaRealizada: 'IMPORTANTE' }),
    ]);
    const frenteBombeiro = r.find((i) => i.frenteId === 'doctum' && i.titulo.includes('bombeiro'));
    expect(frenteBombeiro).toBeTruthy();
    expect(r.some((i) => i.frenteId === 'tribo' && i.tipo === 'GOOD')).toBe(true);
  });

  it('é determinístico (mesma entrada → mesma saída)', () => {
    const blocos = [
      bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'URGENTE' }),
      bloco({ horaInicio: '13:00', horaFim: '15:00', categoriaRealizada: 'DISPERSO' }),
    ];
    expect(JSON.stringify(insights(blocos))).toBe(JSON.stringify(insights(blocos)));
  });

  it('todo insight tem título e texto não vazios', () => {
    const r = insights([
      bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' }),
    ]);
    expect(r.length).toBeGreaterThan(0);
    for (const i of r) {
      expect(i.titulo.trim().length).toBeGreaterThan(0);
      expect(i.texto.trim().length).toBeGreaterThan(0);
    }
  });
});
