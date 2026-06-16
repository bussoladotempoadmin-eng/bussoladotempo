import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarAcoes, STATUS_LABEL } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { DateFilter } from '../date-filter';
import { carregarComercial } from '../contexto';
import { fmtMoney, fmtNum, fmtPeriodo, mesCorrente } from '../fmt';

export const metadata = { title: 'Relatórios · Comercial' };

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string; tipo?: string };
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

  const acoes = await listarAcoes(user.id, orgId, { de, ate });

  const totSolic = acoes.reduce((s, a) => s + (a.valorSolicitado ?? 0), 0);
  const totGasto = acoes.reduce((s, a) => s + (a.valorGasto ?? 0), 0);
  const totLeads = acoes.reduce((s, a) => s + (a.resultadoQtd ?? 0), 0);

  const expHref = `/api/comercial/relatorio/export?de=${de}&ate=${ate}&tipo=${tipo}`;
  const tabBtn = (t: string, label: string) => (
    <Link
      href={`/comercial/relatorios?de=${de}&ate=${ate}&tipo=${t}`}
      className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
        tipo === t ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Relatórios</h1>
        <DateFilter de={de} ate={ate} extras={{ tipo }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tabBtn('verba', 'Verba')}
        {tabBtn('resultados', 'Resultados (leads)')}
        <a
          href={expHref}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-sm font-bold text-primary"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
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
        {tipo === 'verba' ? (
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
        O CSV sai com o recorte do período e do relatório selecionado — abre direto no Excel.
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
