import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import {
  isIsoWeek,
  currentIsoWeek,
  shiftIsoWeek,
  isoWeekRangeLabel,
} from '@/lib/semana';
import { categoriaLabel, type Categoria } from '@/lib/schemas/compromisso';
import {
  calcEspelho,
  gerarInsights,
  CATEGORIAS,
  type BlocoEspelho,
  type TipoInsight,
} from '@bussola/domain';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import {
  Compass,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export const metadata = {
  title: 'Espelho · Bússola do Tempo',
};

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

export default async function EspelhoPage({ params }: { params: { iso: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/espelho/${params.iso}`);
  }

  const iso = decodeURIComponent(params.iso);
  if (!isIsoWeek(iso)) {
    redirect(`/espelho/${currentIsoWeek()}`);
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect('/login');

  const [semana, frentes] = await Promise.all([
    prisma.semanaPlano.findUnique({
      where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: iso } },
    }),
    prisma.frente.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { ordem: 'asc' },
    }),
  ]);
  const blocos = semana
    ? await prisma.bloco.findMany({ where: { semanaPlanoId: semana.id } })
    : [];

  const espelho = calcEspelho(
    blocos.map(
      (b): BlocoEspelho => ({
        frenteId: b.frenteId,
        horaInicio: b.horaInicio,
        horaFim: b.horaFim,
        categoriaPlanejada: b.categoriaPlanejada,
        categoriaRealizada: b.categoriaRealizada,
        tarefa: b.tarefa,
        diaSemana: b.diaSemana,
      }),
    ),
    frentes.map((f) => ({ id: f.id })),
  );

  const insights = gerarInsights(
    espelho,
    frentes.map((f) => ({ id: f.id, nome: f.nome, icone: f.icone })),
  );

  const frenteById = new Map(frentes.map((f) => [f.id, f]));
  const semanaAnterior = shiftIsoWeek(iso, -1);
  const proximaSemana = shiftIsoWeek(iso, 1);
  const vazio = espelho.totalGeral === 0;

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <section className="container max-w-4xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Espelho da semana</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {iso} · {isoWeekRangeLabel(iso)}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              O retrato da sua semana em números — pra onde seu tempo realmente foi, por
              frente e por categoria. Aqui você só observa; refletir e fechar a semana é
              na{' '}
              <Link
                href={`/revisao/${iso}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Revisão
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/espelho/${semanaAnterior}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <Link
              href={`/espelho/${proximaSemana}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/semana/${iso}`}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Pencil className="h-4 w-4" />
              Editar blocos
            </Link>
          </div>
        </div>

        {vazio ? (
          <div className="mt-10 rounded-xl border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Sem blocos nesta semana ainda — não há o que espelhar.
            </p>
            <Link
              href={`/semana/${iso}`}
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Adicionar blocos da semana
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* Summary bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
                <p className="mt-1 text-2xl font-extrabold">
                  {espelho.totalGeral.toLocaleString('pt-BR')}h
                </p>
              </div>
              {CATEGORIAS.map((cat) => (
                <div key={cat} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {categoriaLabel[cat]}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {pct(espelho.percentuaisPorCategoria[cat])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {espelho.totalPorCategoria[cat].toLocaleString('pt-BR')}h
                  </p>
                </div>
              ))}
            </div>

            {/* Coach Gentil — insights */}
            {insights.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Coach Gentil
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {insights.map((ins, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 ${insightClasses[ins.tipo]}`}
                    >
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
                        <span
                          className="inline-flex items-center gap-1.5 font-medium"
                          style={{ color: f.cor }}
                        >
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

            {/* Comparativo planejado vs realizado */}
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
                      {/* barra planejado */}
                      <div className="mb-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-muted-foreground/40"
                          style={{ width: pct(c.planejado) }}
                        />
                      </div>
                      {/* barra realizado */}
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${catBar[cat]}`}
                          style={{ width: pct(c.realizado) }}
                        />
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

            {/* Top 3 desvios */}
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
        )}
      </section>
    </main>
  );
}
