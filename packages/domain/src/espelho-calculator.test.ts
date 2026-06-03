import { describe, it, expect } from 'vitest';
import { calcEspelho, type BlocoEspelho, type FrenteRef } from './espelho-calculator';

const frentes: FrenteRef[] = [{ id: 'doctum' }, { id: 'tribo' }];

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

describe('EspelhoCalculator', () => {
  it('semana vazia: tudo zero, sem desvios', () => {
    const r = calcEspelho([], frentes);
    expect(r.totalGeral).toBe(0);
    expect(r.totalPorCategoria.IMPORTANTE).toBe(0);
    expect(r.percentuaisPorCategoria.URGENTE).toBe(0);
    expect(r.topDesvios).toEqual([]);
    expect(r.matriz.IMPORTANTE.doctum).toBe(0);
  });

  it('soma horas na célula certa da matriz (frente × categoria realizada)', () => {
    const r = calcEspelho(
      [
        bloco({ frenteId: 'doctum', horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'IMPORTANTE' }), // 4h
        bloco({ frenteId: 'doctum', horaInicio: '13:00', horaFim: '15:00', categoriaRealizada: 'URGENTE' }), // 2h
        bloco({ frenteId: 'tribo', horaInicio: '14:00', horaFim: '17:00', categoriaRealizada: 'IMPORTANTE' }), // 3h
      ],
      frentes,
    );
    expect(r.matriz.IMPORTANTE.doctum).toBe(4);
    expect(r.matriz.URGENTE.doctum).toBe(2);
    expect(r.matriz.IMPORTANTE.tribo).toBe(3);
    expect(r.totalPorFrente.doctum).toBe(6);
    expect(r.totalPorFrente.tribo).toBe(3);
    expect(r.totalPorCategoria.IMPORTANTE).toBe(7);
    expect(r.totalGeral).toBe(9);
  });

  it('percentuais por categoria somam 1 quando há horas', () => {
    const r = calcEspelho(
      [
        bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaRealizada: 'IMPORTANTE' }), // 4h
        bloco({ horaInicio: '13:00', horaFim: '17:00', categoriaRealizada: 'DISPERSO' }), // 4h
      ],
      frentes,
    );
    const soma =
      r.percentuaisPorCategoria.IMPORTANTE +
      r.percentuaisPorCategoria.URGENTE +
      r.percentuaisPorCategoria.DISPERSO;
    expect(soma).toBeCloseTo(1, 5);
    expect(r.percentuaisPorCategoria.IMPORTANTE).toBeCloseTo(0.5, 5);
  });

  it('comparativo planejado vs realizado calcula delta', () => {
    // Planejado IMPORTANTE, realizado URGENTE (invasão de 4h).
    const r = calcEspelho(
      [bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' })],
      frentes,
    );
    expect(r.comparativo.IMPORTANTE.planejado).toBeCloseTo(1, 5);
    expect(r.comparativo.IMPORTANTE.realizado).toBeCloseTo(0, 5);
    expect(r.comparativo.IMPORTANTE.delta).toBeCloseTo(-1, 5);
    expect(r.comparativo.URGENTE.delta).toBeCloseTo(1, 5);
  });

  it('topDesvios pega os 3 maiores por duração, só blocos que desviaram', () => {
    const r = calcEspelho(
      [
        bloco({ horaInicio: '08:00', horaFim: '12:00', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' }), // desvio 4h
        bloco({ horaInicio: '13:00', horaFim: '14:00', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'DISPERSO' }), // desvio 1h
        bloco({ horaInicio: '14:00', horaFim: '16:30', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' }), // desvio 2.5h
        bloco({ horaInicio: '17:00', horaFim: '18:00', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'DISPERSO' }), // desvio 1h
        bloco({ horaInicio: '19:00', horaFim: '21:00', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' }), // sem desvio
      ],
      frentes,
    );
    expect(r.topDesvios).toHaveLength(3);
    expect(r.topDesvios[0].duracaoHoras).toBe(4);
    expect(r.topDesvios[1].duracaoHoras).toBe(2.5);
    expect(r.topDesvios[2].duracaoHoras).toBe(1);
    // o bloco sem desvio nunca entra
    expect(r.topDesvios.every((b) => b.categoriaPlanejada !== b.categoriaRealizada)).toBe(true);
  });
});
