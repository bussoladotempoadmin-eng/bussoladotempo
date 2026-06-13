import { categoriaLabel, type Categoria } from '@/lib/schemas/compromisso';
import { calcEspelho, gerarInsights, CATEGORIAS, type TipoInsight } from '@bussola/domain';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Espelho = ReturnType<typeof calcEspelho>;
type Insight = ReturnType<typeof gerarInsights>[number];
type Frente = { id: string; nome: string; icone: string; cor: string };

const catClasses: Record<Categoria, string> = {
  IMPORTANTE: 'bg-triade-importante-soft text-triade-importante',
  URGENTE: 'bg-triade-urgente-soft text-triade-urgente',
  DISPERSO: 'bg-triade-disperso-soft text-triade-disperso',
};
const catBar: Record<Categoria, string> = {
  IMPORTANTE: 'bg-triade-importante',
  URGENTE: 'bg-triade-urgente',
  DISPERSO: 'bg-triade-disperso',
};
const insightClasses: Record<TipoInsight, string> = {
  GOOD: 'border-emerald-500/30 bg-emerald-500/10',
  WARN: 'border-amber-500/30 bg-amber-500/10',
  TIP: 'border-sky-500/30 bg-sky-500/10',
  NEUTRAL: 'border-border bg-card',
};

function pct(frac: number): string {
  return `${Math.round(frac * 100)}%`;
}
function h(n: number): string {
  return n > 0 ? `${n.toLocaleString('pt-BR')}h` : '—';
}

/**
 * Painel do Espelho (números da semana) — apresentacional, sem estado.
 * Inclui o "Coach Gentil" (insights automáticos grátis, pra consulta diária).
 */
export function EspelhoPainel({
  espelho,
  insights,
  frentes,
}: {
  espelho: Espelho;
  insights: Insight[];
  frentes: Frente[];
}) {
  const frenteById = new Map(frentes.map((f) => [f.id, f]));

  if (espelho.totalGeral === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Sem blocos nesta semana ainda — não há o que espelhar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-extrabold">
            {espelho.totalGeral.toLocaleString('pt-BR')}h
          </p>
        </div>
        {CATEGORIAS.map((cat) => (
          <div key={cat} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {categoriaLabel[cat]}
            </p>
            <p className="mt-1 text-2xl font-extrabold">{pct(espelho.percentuaisPorCategoria[cat])}</p>
            <p className="text-xs text-muted-foreground">
              {espelho.totalPorCategoria[cat].toLocaleString('pt-BR')}h
            </p>
          </div>
        ))}
      </div>

      {/* Coach Gentil */}
      {insights.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Coach Gentil
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-xl border p-4 ${insightClasses[ins.tipo]}`}>
                <p className="text-sm font-bold">{ins.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{ins.texto}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matriz Frente × Categoria */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-3 text-left font-semibold">Frente</th>
              {CATEGORIAS.map((cat) => (
                <th key={cat} className="p-3 text-right font-semibold">
                  <span className={`rounded-full px-2 py-0.5 ${catClasses[cat]}`}>
                    {categoriaLabel[cat]}
                  </span>
                </th>
              ))}
              <th className="p-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {frentes.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: f.cor }}>
                    {f.icone} {f.nome}
                  </span>
                </td>
                {CATEGORIAS.map((cat) => (
                  <td key={cat} className="p-3 text-right font-mono text-muted-foreground">
                    {h(espelho.matriz[cat][f.id] ?? 0)}
                  </td>
                ))}
                <td className="p-3 text-right font-mono font-semibold">
                  {h(espelho.totalPorFrente[f.id] ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30 font-semibold">
              <td className="p-3">Total</td>
              {CATEGORIAS.map((cat) => (
                <td key={cat} className="p-3 text-right font-mono">
                  {h(espelho.totalPorCategoria[cat])}
                </td>
              ))}
              <td className="p-3 text-right font-mono">
                {espelho.totalGeral.toLocaleString('pt-BR')}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Planejado vs realizado */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Planejado vs realizado
        </h2>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          {CATEGORIAS.map((cat) => {
            const c = espelho.comparativo[cat];
            const subiu = c.delta > 0.001;
            const desceu = c.delta < -0.001;
            return (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold">{categoriaLabel[cat]}</span>
                  <span
                    className={
                      subiu
                        ? 'flex items-center gap-1 text-triade-urgente'
                        : desceu
                          ? 'flex items-center gap-1 text-triade-importante'
                          : 'text-muted-foreground'
                    }
                  >
                    {subiu && <TrendingUp className="h-3 w-3" />}
                    {desceu && <TrendingDown className="h-3 w-3" />}
                    {c.delta >= 0 ? '+' : ''}
                    {pct(c.delta)}
                  </span>
                </div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: pct(c.planejado) }} />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${catBar[cat]}`} style={{ width: pct(c.realizado) }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>planejado {pct(c.planejado)}</span>
                  <span>realizado {pct(c.realizado)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top desvios */}
      {espelho.topDesvios.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Maiores desvios (planejado → realizado)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {espelho.topDesvios.map((d, i) => {
              const f = frenteById.get(d.frenteId);
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <p className="truncate text-sm font-semibold">{d.tarefa ?? 'Bloco'}</p>
                  {f && (
                    <p className="mt-0.5 text-xs" style={{ color: f.cor }}>
                      {f.icone} {f.nome}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${catClasses[d.categoriaPlanejada]}`}>
                      {categoriaLabel[d.categoriaPlanejada]}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`rounded-full px-2 py-0.5 ${catClasses[d.categoriaRealizada]}`}>
                      {categoriaLabel[d.categoriaRealizada]}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {d.duracaoHoras.toLocaleString('pt-BR')}h
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
