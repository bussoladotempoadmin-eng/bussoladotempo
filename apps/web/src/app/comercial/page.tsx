import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getPainelComercial } from '@/lib/comercial';
import { Compass } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ComercialShell } from './comercial-shell';
import { AtivarComercial } from './ativar-comercial';
import { DateFilter } from './date-filter';
import { carregarComercial } from './contexto';
import { fmtMoney, fmtNum, mesCorrente } from './fmt';

export const metadata = { title: 'Comercial · Bússola do Tempo' };

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial');
  const user = await getSessionUser();
  if (!user) redirect('/login?callbackUrl=/comercial');

  const ctx = await carregarComercial(user.id);
  if (!ctx) {
    return (
      <main className="min-h-screen">
        <header className="container flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Compass className="h-6 w-6 text-primary" />
            <span>Bússola do Tempo</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <section className="container py-10">
          <AtivarComercial />
        </section>
      </main>
    );
  }

  const { empresas, orgId, escopo } = ctx;
  const def = mesCorrente();
  const de = searchParams.de || def.de;
  const ate = searchParams.ate || def.ate;
  const p = await getPainelComercial(user.id, orgId, { de, ate });

  const maxLeads = Math.max(1, ...p.porUnidade.map((u) => u.leads));
  const tiposComLead = p.porTipo.filter((t) => t.custoPorLead !== null);
  const maxCPL = Math.max(1, ...tiposComLead.map((t) => t.custoPorLead ?? 0));

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Painel · {escopo.org.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {escopo.ehDono ? `${escopo.unidades.length} unidade(s)` : 'Sua unidade'}
          </p>
        </div>
        <DateFilter de={de} ate={ate} />
      </div>

      {p.totalAcoes === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="font-semibold">Nenhuma ação no período.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre uma unidade e registre as primeiras ações pra ver os números aqui.
          </p>
          <Link
            href="/comercial/acoes/nova"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            + Nova ação
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 p-4 text-white md:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                Custo por lead
              </p>
              <p className="mt-1 text-2xl font-black">
                {p.custoPorLead === null ? '—' : fmtMoney(p.custoPorLead, 2)}
              </p>
            </div>
            <Kpi label="Leads captados" valor={fmtNum(p.totalLeads)} cor="text-emerald-600" />
            <Kpi label="Execução" valor={`${p.pctExecucao}%`} sub={`${p.executadas}/${p.totalAcoes} ações`} />
            <Kpi label="Solicitado" valor={fmtMoney(p.totalSolicitado)} />
            <Kpi
              label="Gasto"
              valor={fmtMoney(p.totalGasto)}
              sub={
                p.totalGasto <= p.totalSolicitado
                  ? `${fmtMoney(p.totalSolicitado - p.totalGasto)} abaixo`
                  : `${fmtMoney(p.totalGasto - p.totalSolicitado)} acima`
              }
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-bold">Leads por unidade</h3>
              {p.porUnidade.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
              {p.porUnidade.map((u) => (
                <Bar key={u.nome} nome={u.nome} pct={(u.leads / maxLeads) * 100} valor={fmtNum(u.leads)} />
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-1 text-sm font-bold">O que mais converte</h3>
              <p className="mb-3 text-xs text-muted-foreground">Custo por lead — menor é melhor.</p>
              {tiposComLead.length === 0 && (
                <p className="text-sm text-muted-foreground">Registre resultados pra ver isso.</p>
              )}
              {tiposComLead.map((t) => (
                <Bar
                  key={t.tipo}
                  nome={t.tipo}
                  pct={((t.custoPorLead ?? 0) / maxCPL) * 100}
                  valor={fmtMoney(t.custoPorLead, 2)}
                  cor="bg-violet-500"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </ComercialShell>
  );
}

function Kpi({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-black ${cor ?? ''}`}>{valor}</p>
      {sub && <p className="text-[11px] font-semibold text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Bar({ nome, pct, valor, cor }: { nome: string; pct: number; valor: string; cor?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <div className="w-24 shrink-0 truncate text-[13px] font-semibold">{nome}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${cor ?? 'bg-primary'}`} style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
      <div className="w-20 shrink-0 text-right text-[13px] font-bold tabular-nums">{valor}</div>
    </div>
  );
}
