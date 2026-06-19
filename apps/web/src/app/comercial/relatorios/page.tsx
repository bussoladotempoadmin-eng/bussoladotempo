import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarAcoes, STATUS_LABEL } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { DateFilter } from '../date-filter';
import { carregarComercial } from '../contexto';
import { fmtMoney, fmtNum, fmtPeriodo, mesCorrente } from '../fmt';
import { ExportarRelatorio } from './exportar';

export const metadata = { title: 'Relatórios · Comercial' };

type ResumoUnidade = { nome: string; qtd: number; solicitado: number; gasto: number; leads: number };

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string; tipo?: string; modo?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/relatorios');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  const def = mesCorrente();
  const de = searchParams.de || def.de;
  const ate = searchParams.ate || def.ate;
  const tipo = searchParams.tipo === 'resultados' ? 'resultados' : 'verba';
  const modo = searchParams.modo === 'unificado' ? 'unificado' : 'detalhado';

  const acoes = await listarAcoes(user.id, orgId, { de, ate });

  const totSolic = acoes.reduce((s, a) => s + (a.valorSolicitado ?? 0), 0);
  const totGasto = acoes.reduce((s, a) => s + (a.valorGasto ?? 0), 0);
  const totLeads = acoes.reduce((s, a) => s + (a.resultadoQtd ?? 0), 0);

  // Somatória por unidade (modo unificado).
  const mapaUni = new Map<string, ResumoUnidade>();
  for (const a of acoes) {
    const cur = mapaUni.get(a.unidadeNome) ?? { nome: a.unidadeNome, qtd: 0, solicitado: 0, gasto: 0, leads: 0 };
    cur.qtd += 1;
    cur.solicitado += a.valorSolicitado ?? 0;
    cur.gasto += a.valorGasto ?? 0;
    cur.leads += a.resultadoQtd ?? 0;
    mapaUni.set(a.unidadeNome, cur);
  }
  const porUnidade = Array.from(mapaUni.values()).sort((x, y) => y.gasto - x.gasto);

  const qs = (over: Partial<{ tipo: string; modo: string }>) =>
    `/comercial/relatorios?de=${de}&ate=${ate}&tipo=${over.tipo ?? tipo}&modo=${over.modo ?? modo}`;
  const expHref = `/api/comercial/relatorio/export?de=${de}&ate=${ate}&tipo=${tipo}&modo=${modo}`;

  const btn = (ativo: boolean, href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
        ativo ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Relatórios</h1>
        <DateFilter de={de} ate={ate} extras={{ tipo, modo }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {btn(tipo === 'verba', qs({ tipo: 'verba' }), 'Verba')}
        {btn(tipo === 'resultados', qs({ tipo: 'resultados' }), 'Resultados (leads)')}
        <ExportarRelatorio expHref={expHref} orgId={orgId} de={de} ate={ate} podeRepasse={escopo.corporativo} />
      </div>

      {/* Detalhado (ação por ação) × Unificado (somatória por unidade) */}
      <div className="mt-2 inline-flex gap-1 rounded-lg border border-border p-1">
        {btn(modo === 'detalhado', qs({ modo: 'detalhado' }), 'Detalhado')}
        {btn(modo === 'unificado', qs({ modo: 'unificado' }), 'Unificado')}
      </div>

      {acoes.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="font-semibold">Nenhuma ação no período.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste as datas ou registre ações pra gerar o relatório.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          {modo === 'unificado' ? (
            // ---------- UNIFICADO: somatória por unidade ----------
            tipo === 'verba' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Th>Unidade</Th>
                    <Th right>Ações</Th>
                    <Th right>Solicitado</Th>
                    <Th right>Gasto</Th>
                    <Th right>Diferença</Th>
                  </tr>
                </thead>
                <tbody>
                  {porUnidade.map((u) => {
                    const diff = u.gasto - u.solicitado;
                    return (
                      <tr key={u.nome} className="border-t border-border">
                        <Td>{u.nome}</Td>
                        <Td right>{fmtNum(u.qtd)}</Td>
                        <Td right>{fmtMoney(u.solicitado)}</Td>
                        <Td right>{fmtMoney(u.gasto)}</Td>
                        <Td right cor={diff > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {(diff > 0 ? '+' : '') + fmtMoney(diff)}
                        </Td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-border bg-muted font-bold">
                    <Td>Total</Td>
                    <Td right>{fmtNum(acoes.length)}</Td>
                    <Td right>{fmtMoney(totSolic)}</Td>
                    <Td right>{fmtMoney(totGasto)}</Td>
                    <Td right cor={totGasto > totSolic ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {(totGasto - totSolic > 0 ? '+' : '') + fmtMoney(totGasto - totSolic)}
                    </Td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Th>Unidade</Th>
                    <Th right>Ações</Th>
                    <Th right>Leads</Th>
                    <Th right>Gasto</Th>
                    <Th right>Custo / lead</Th>
                  </tr>
                </thead>
                <tbody>
                  {porUnidade.map((u) => (
                    <tr key={u.nome} className="border-t border-border">
                      <Td>{u.nome}</Td>
                      <Td right>{fmtNum(u.qtd)}</Td>
                      <Td right cor="text-emerald-600 dark:text-emerald-400">{fmtNum(u.leads)}</Td>
                      <Td right>{fmtMoney(u.gasto)}</Td>
                      <Td right>{u.leads > 0 ? fmtMoney(u.gasto / u.leads) : '—'}</Td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted font-bold">
                    <Td>Total</Td>
                    <Td right>{fmtNum(acoes.length)}</Td>
                    <Td right>{fmtNum(totLeads)}</Td>
                    <Td right>{fmtMoney(totGasto)}</Td>
                    <Td right>{totLeads > 0 ? fmtMoney(totGasto / totLeads) : '—'}</Td>
                  </tr>
                </tbody>
              </table>
            )
          ) : // ---------- DETALHADO: ação por ação ----------
          tipo === 'verba' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Th>Unidade</Th>
                  <Th>Tipo</Th>
                  <Th>Responsável</Th>
                  <Th right>Solicitado</Th>
                  <Th right>Gasto</Th>
                  <Th right>Diferença</Th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((a) => {
                  const diff = a.valorGasto !== null && a.valorSolicitado !== null ? a.valorGasto - a.valorSolicitado : null;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <Td>{a.unidadeNome}</Td>
                      <Td>{a.tipo}</Td>
                      <Td>{a.responsaveis || '—'}</Td>
                      <Td right>{fmtMoney(a.valorSolicitado)}</Td>
                      <Td right>{fmtMoney(a.valorGasto)}</Td>
                      <Td right cor={diff === null ? '' : diff > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {diff === null ? '—' : (diff > 0 ? '+' : '') + fmtMoney(diff)}
                      </Td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted font-bold">
                  <Td>Total</Td>
                  <Td />
                  <Td />
                  <Td right>{fmtMoney(totSolic)}</Td>
                  <Td right>{fmtMoney(totGasto)}</Td>
                  <Td right cor={totGasto > totSolic ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {(totGasto - totSolic > 0 ? '+' : '') + fmtMoney(totGasto - totSolic)}
                  </Td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Th>Unidade</Th>
                  <Th>Tipo</Th>
                  <Th>Período</Th>
                  <Th>Status</Th>
                  <Th>Resultado</Th>
                  <Th right>Qtd.</Th>
                  <Th>Comentário</Th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <Td>{a.unidadeNome}</Td>
                    <Td>{a.tipo}</Td>
                    <Td>{fmtPeriodo(a.dataInicio, a.dataFim)}</Td>
                    <Td>{STATUS_LABEL[a.status]}</Td>
                    <Td>{a.resultado || '—'}</Td>
                    <Td right cor="text-emerald-600 dark:text-emerald-400">{fmtNum(a.resultadoQtd)}</Td>
                    <Td>{a.comentarios || '—'}</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-muted font-bold">
                  <Td>Total de leads</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td right>{fmtNum(totLeads)}</Td>
                  <Td />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {modo === 'unificado'
          ? 'Unificado: somatória por unidade no período. O CSV sai com este mesmo recorte.'
          : 'Detalhado: ação por ação no período. O CSV sai com este mesmo recorte.'}
      </p>
    </ComercialShell>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2.5 font-bold ${right ? 'text-right' : ''}`}>{children}</th>;
}
function Td({ children, right, cor }: { children?: React.ReactNode; right?: boolean; cor?: string }) {
  return (
    <td className={`whitespace-nowrap px-3 py-2.5 ${right ? 'text-right tabular-nums' : ''} ${cor ?? ''}`}>
      {children}
    </td>
  );
}
