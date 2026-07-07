import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarRepasses } from '@/lib/comercial-repasse';
import { ComercialShell } from '../comercial-shell';
import { carregarComercial } from '../contexto';
import { RepassesView } from './repasses-view';
import { RelatorioRepasseBar } from './relatorio-bar';

export const metadata = { title: 'Repasses · Comercial' };
export const dynamic = 'force-dynamic';

export default async function RepassesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/repasses');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;
  if (!escopo.corporativo) redirect('/comercial'); // só corporativo

  const itens = (await listarRepasses(user.id, orgId)) ?? [];

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <h1 className="text-2xl font-extrabold tracking-tight">Repasses</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Valores a repassar por unidade. Marque cada um como feito, parcial ou não feito — o que for pago é
        creditado no caixa da unidade.
      </p>
      <RelatorioRepasseBar />
      <RepassesView itens={itens} />
    </ComercialShell>
  );
}
