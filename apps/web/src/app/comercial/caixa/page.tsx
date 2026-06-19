import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getCaixaUnidade, getCaixaTotais } from '@/lib/comercial-caixa';
import { ComercialShell } from '../comercial-shell';
import { DateFilter } from '../date-filter';
import { carregarComercial } from '../contexto';
import { fmtMoney } from '../fmt';
import { CaixaView } from './caixa-view';

export const metadata = { title: 'Caixa · Comercial' };
export const dynamic = 'force-dynamic';

const TODAS = 'todas';

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: { u?: string; de?: string; ate?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/caixa');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  const unidades = escopo.unidades;
  const multi = unidades.length > 1; // diretor / coordenador de várias
  const sel = searchParams.u;

  // Com várias unidades, a visão padrão é o consolidado ("Todas").
  const modoTodas = multi && (!sel || sel === TODAS);
  const unidadeId = modoTodas
    ? null
    : sel && unidades.some((u) => u.id === sel)
      ? sel
      : unidades[0]?.id ?? null;

  const de = searchParams.de || '';
  const ate = searchParams.ate || '';

  const [totais, caixa] = await Promise.all([
    multi ? getCaixaTotais(user.id, orgId) : Promise.resolve(null),
    unidadeId ? getCaixaUnidade(user.id, unidadeId, { de, ate }) : Promise.resolve(null),
  ]);
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome ?? '';

  const chip = (href: string, label: string, ativo: boolean) => (
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
      <h1 className="text-2xl font-extrabold tracking-tight">Caixa</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Saldo e extrato de verba por unidade. Gastos de ações entram como saída automática.
      </p>

      {unidades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="font-semibold">Nenhuma unidade ainda.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma unidade em{' '}
            <Link href="/comercial/unidades" className="text-primary underline">Unidades</Link> pra abrir o caixa dela.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {multi && chip(`/comercial/caixa?u=${TODAS}`, 'Todas as unidades', modoTodas)}
            {unidades.map((u) => chip(`/comercial/caixa?u=${u.id}`, u.nome, u.id === unidadeId))}
          </div>

          {modoTodas && totais ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Saldo consolidado · todas as unidades
                </div>
                <div className={`mt-1 text-3xl font-extrabold tabular-nums ${totais.total < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {fmtMoney(totais.total, 2)}
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5 font-bold">Unidade</th>
                      <th className="px-3 py-2.5 text-right font-bold">Saldo</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {totais.porUnidade.map((u) => (
                      <tr key={u.unidadeId} className="border-t border-border">
                        <td className="px-3 py-2.5 font-medium">{u.nome}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${u.saldo < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {fmtMoney(u.saldo, 2)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href={`/comercial/caixa?u=${u.unidadeId}`} className="text-xs font-semibold text-primary hover:underline">
                            Ver extrato →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            caixa &&
            unidadeId && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <DateFilter de={de} ate={ate} extras={{ u: unidadeId }} />
                  <div className="flex gap-2">
                    <a
                      href={`/api/comercial/caixa/export?formato=excel&u=${unidadeId}&de=${de}&ate=${ate}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 px-3.5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Excel
                    </a>
                    <a
                      href={`/api/comercial/caixa/export?formato=pdf&u=${unidadeId}&de=${de}&ate=${ate}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2.5 text-sm font-bold text-primary"
                    >
                      <FileText className="h-4 w-4" /> PDF
                    </a>
                  </div>
                </div>
                <CaixaView
                  unidadeId={unidadeId}
                  unidadeNome={unidadeNome}
                  caixa={caixa}
                  podeEditar={!escopo.somenteLeitura}
                />
              </div>
            )
          )}
        </>
      )}
    </ComercialShell>
  );
}
