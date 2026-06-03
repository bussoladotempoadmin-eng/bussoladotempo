/**
 * EspelhoCalculator — calcula o "espelho" da semana: a matriz Frente × Categoria
 * com totais, percentuais, comparativo planejado vs realizado e os maiores desvios.
 *
 * Implementa a lógica da §9.2 da spec (docs/02-spec-tecnica/arquitetura.md).
 * Função pura e determinística (sem banco) — recebe blocos + frentes.
 */
import type { Categoria } from './agenda-suggester';

export const CATEGORIAS: Categoria[] = ['IMPORTANTE', 'URGENTE', 'DISPERSO'];

export interface BlocoEspelho {
  frenteId: string;
  horaInicio: string; // "HH:mm"
  horaFim: string; // "HH:mm"
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
  tarefa?: string;
  diaSemana?: string;
}

export interface FrenteRef {
  id: string;
}

export interface ComparativoCategoria {
  planejado: number; // fração 0..1
  realizado: number; // fração 0..1
  delta: number; // realizado - planejado
}

export interface DesvioBloco extends BlocoEspelho {
  duracaoHoras: number;
}

export interface EspelhoResult {
  matriz: Record<Categoria, Record<string, number>>;
  totalPorFrente: Record<string, number>;
  totalPorCategoria: Record<Categoria, number>;
  totalGeral: number;
  percentuaisPorCategoria: Record<Categoria, number>;
  comparativo: Record<Categoria, ComparativoCategoria>;
  topDesvios: DesvioBloco[];
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function duracaoHoras(b: BlocoEspelho): number {
  return (toMin(b.horaFim) - toMin(b.horaInicio)) / 60;
}

function frac(parte: number, total: number): number {
  return total > 0 ? parte / total : 0;
}

export function calcEspelho(blocos: BlocoEspelho[], frentes: FrenteRef[]): EspelhoResult {
  // matriz[categoria][frenteId] = horas realizadas
  const matriz = {} as Record<Categoria, Record<string, number>>;
  for (const cat of CATEGORIAS) {
    matriz[cat] = {};
    for (const f of frentes) matriz[cat][f.id] = 0;
  }

  const totalPorFrente: Record<string, number> = {};
  for (const f of frentes) totalPorFrente[f.id] = 0;

  const totalPorCategoria = { IMPORTANTE: 0, URGENTE: 0, DISPERSO: 0 } as Record<
    Categoria,
    number
  >;
  const planejadoPorCategoria = { IMPORTANTE: 0, URGENTE: 0, DISPERSO: 0 } as Record<
    Categoria,
    number
  >;
  let totalGeral = 0;

  for (const b of blocos) {
    const horas = duracaoHoras(b);
    if (horas <= 0) continue;
    totalGeral += horas;

    // realizado alimenta a matriz e os totais por frente/categoria
    if (matriz[b.categoriaRealizada][b.frenteId] === undefined) {
      // frente do bloco não está na lista de frentes (ex: frente removida) — ignora na matriz
    } else {
      matriz[b.categoriaRealizada][b.frenteId] += horas;
      totalPorFrente[b.frenteId] += horas;
    }
    totalPorCategoria[b.categoriaRealizada] += horas;
    planejadoPorCategoria[b.categoriaPlanejada] += horas;
  }

  const percentuaisPorCategoria = {} as Record<Categoria, number>;
  const comparativo = {} as Record<Categoria, ComparativoCategoria>;
  for (const cat of CATEGORIAS) {
    percentuaisPorCategoria[cat] = frac(totalPorCategoria[cat], totalGeral);
    const planejado = frac(planejadoPorCategoria[cat], totalGeral);
    const realizado = frac(totalPorCategoria[cat], totalGeral);
    comparativo[cat] = { planejado, realizado, delta: realizado - planejado };
  }

  const topDesvios: DesvioBloco[] = blocos
    .filter((b) => b.categoriaPlanejada !== b.categoriaRealizada)
    .map((b) => ({ ...b, duracaoHoras: duracaoHoras(b) }))
    .sort((a, b) => b.duracaoHoras - a.duracaoHoras)
    .slice(0, 3);

  return {
    matriz,
    totalPorFrente,
    totalPorCategoria,
    totalGeral,
    percentuaisPorCategoria,
    comparativo,
    topDesvios,
  };
}
