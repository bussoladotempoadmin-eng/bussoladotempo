import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getRepasses } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { UnidadesView } from './unidades-view';
import { carregarComercial } from '../contexto';

export const metadata = { title: 'Unidades · Comercial' };

export default async function UnidadesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/unidades');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;
  const repasses = escopo.podeConfigRepasse ? await getRepasses(user.id, orgId) : {};

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <h1 className="text-2xl font-extrabold tracking-tight">Unidades · {escopo.org.nome}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        As cidades / unidades desta empresa.
      </p>
      <UnidadesView
        inicial={escopo.unidades}
        ehDono={escopo.ehDono}
        orgId={orgId}
        podeConfigRepasse={escopo.podeConfigRepasse}
        repasses={repasses}
      />
    </ComercialShell>
  );
}
