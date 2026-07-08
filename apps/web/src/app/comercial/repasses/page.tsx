import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ListChecks, FileText } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarRepasses, listarLotesRepasse } from '@/lib/comercial-repasse';
import { ComercialShell } from '../comercial-shell';
import { carregarComercial } from '../contexto';
import { RepassesView } from './repasses-view';
import { LotesView } from './lotes-view';

export const metadata = { title: 'Repasses · Comercial' };
export const dynamic = 'force-dynamic';

export default async function RepassesPage({ searchParams }: { searchParams: { view?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/repasses');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;
  if (!escopo.corporativo) redirect('/comercial'); // só corporativo

  const view = searchParams.view === 'relatorios' ? 'relatorios' : 'controle';
  const itens = view === 'controle' ? (await listarRepasses(user.id, orgId)) ?? [] : [];
  const lotes = view === 'relatorios' ? (await listarLotesRepasse(user.id, orgId)) ?? [] : [];

  const tabBase = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors';
  const tabOn = 'bg-card border border-border';
  const tabOff = 'text-muted-foreground hover:bg-muted';

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <h1 className="text-2xl font-extrabold tracking-tight">Repasses</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {view === 'controle'
          ? 'Marque cada repasse como feito, parcial ou não feito — o que for pago é creditado no caixa da unidade.'
          : 'Histórico de relatórios emitidos. Cada relação de repasse salva vira um relatório aqui, pra reabrir, imprimir ou baixar.'}
      </p>

      <div className="mb-5 inline-flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        <Link href="/comercial/repasses" className={`${tabBase} ${view === 'controle' ? tabOn : tabOff}`}>
          <ListChecks className="h-4 w-4" />
          Controle
        </Link>
        <Link
          href="/comercial/repasses?view=relatorios"
          className={`${tabBase} ${view === 'relatorios' ? tabOn : tabOff}`}
        >
          <FileText className="h-4 w-4" />
          Relatórios
        </Link>
      </div>

      {view === 'controle' ? <RepassesView itens={itens} /> : <LotesView lotes={lotes} />}
    </ComercialShell>
  );
}
