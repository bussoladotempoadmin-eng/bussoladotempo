import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getPainelTime, type ResumoMembro } from '@/lib/painel-time';
import { lerTimeIACache } from '@/lib/team-ia';
import { currentIsoWeek, shiftIsoWeek, isoWeekLabel, isIsoWeek } from '@/lib/semana';
import { TimeIAView } from './time-ia-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft, ChevronLeft, ChevronRight, Users, Settings2 } from 'lucide-react';

export const metadata = { title: 'Painel do time · Bússola do Tempo' };

function pct(f: number) {
  return `${Math.round(f * 100)}%`;
}

function statusDe(m: ResumoMembro): { txt: string; cls: string } {
  if (!m.temDados || m.totalHoras < 8) return { txt: 'pouco registro', cls: 'bg-red-500/15 text-red-400' };
  if (m.pDisperso > 0.25) return { txt: 'muito disperso', cls: 'bg-amber-500/15 text-amber-400' };
  if (m.pUrgente > 0.35) return { txt: 'muita urgência', cls: 'bg-amber-500/15 text-amber-400' };
  return { txt: 'saudável', cls: 'bg-emerald-500/15 text-emerald-400' };
}

export default async function PainelTimePage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/time/painel');

  const user = await getSessionUser();
  const iso = searchParams.semana && isIsoWeek(searchParams.semana) ? searchParams.semana : currentIsoWeek();
  const painel = user ? await getPainelTime(user.id, iso) : null;
  const iaInicial =
    user && painel && painel.membros.length > 0 ? await lerTimeIACache(user.id, iso) : null;

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
          href="/time"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Gerenciar time
        </Link>

        {!painel || painel.membros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {painel
                ? 'Você ainda não tem ninguém no seu galho. Adicione pessoas no time.'
                : 'Você não gerencia um time.'}
            </p>
            <Link
              href="/time"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Ir pra Meu time
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Painel do time
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight">{painel.org.nome}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Semana de {isoWeekLabel(iso)} · {painel.membros.length} no seu galho ·{' '}
                  {painel.agregado.comDados} registraram
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/time/painel?semana=${shiftIsoWeek(iso, -1)}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Link>
                <Link
                  href={`/time/painel?semana=${shiftIsoWeek(iso, 1)}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Resumo do time */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Horas do time
                </p>
                <p className="mt-1 text-3xl font-extrabold">
                  {painel.agregado.totalHoras.toLocaleString('pt-BR')}h
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pra onde foi o tempo
                </p>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
                  <span className="bg-triade-importante" style={{ width: pct(painel.agregado.pImportante) }} />
                  <span className="bg-triade-urgente" style={{ width: pct(painel.agregado.pUrgente) }} />
                  <span className="bg-triade-disperso" style={{ width: pct(painel.agregado.pDisperso) }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>🎯 Importante {pct(painel.agregado.pImportante)}</span>
                  <span>🔥 Urgente {pct(painel.agregado.pUrgente)}</span>
                  <span>💨 Disperso {pct(painel.agregado.pDisperso)}</span>
                </div>
              </div>
            </div>

            {/* Análise da IA do time */}
            <div className="mt-6">
              <TimeIAView semana={iso} inicial={iaInicial} />
            </div>

            {/* Lista de membros */}
            <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Pessoas
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {painel.membros.map((m) => {
                const st = statusDe(m);
                return (
                  <li key={m.membroId}>
                    <Link
                      href={`/time/membro/${m.userId}?semana=${iso}`}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {m.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.temDados ? `${m.totalHoras.toLocaleString('pt-BR')}h` : 'sem registro'}
                        {m.focoFrente && ` · foco: ${m.focoFrente}`}
                      </p>
                    </div>
                    {m.temDados && (
                      <div className="flex h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <span className="bg-triade-importante" style={{ width: pct(m.pImportante) }} />
                        <span className="bg-triade-urgente" style={{ width: pct(m.pUrgente) }} />
                        <span className="bg-triade-disperso" style={{ width: pct(m.pDisperso) }} />
                      </div>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>
                      {st.txt}
                    </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
              <span className="text-base">🔒</span>
              <p>
                Você vê <b className="text-foreground">o tempo e a distribuição</b> de cada pessoa do
                seu galho. As <b className="text-foreground">reflexões pessoais</b> de cada um ficam
                privadas. <span className="inline-flex items-center gap-1"><Settings2 className="h-3 w-3" /> Em breve:</span> análise da IA do time e &ldquo;sugerir foco&rdquo;.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
