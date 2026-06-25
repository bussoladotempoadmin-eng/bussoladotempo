import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarTipos } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { TiposView } from './tipos-view';
import { carregarComercial } from '../contexto';

export const metadata = { title: 'Tipos de ação · Comercial' };

export default async function TiposPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/tipos');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  const tipos = await listarTipos(orgId);

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <h1 className="text-2xl font-extrabold tracking-tight">Tipos de ação · {escopo.org.nome}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Crie os tipos que fazem sentido pra esta empresa — eles aparecem no formulário de ação e
        viram filtro nos relatórios.
      </p>
      <TiposView inicial={tipos} ehDono={escopo.podeGerenciarAcessos} orgId={orgId} />
    </ComercialShell>
  );
}
