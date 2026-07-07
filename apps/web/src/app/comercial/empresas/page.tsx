import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarTodasEmpresas, podeGerenciarEmpresas } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { EmpresasView } from './empresas-view';
import { carregarComercial } from '../contexto';

export const metadata = { title: 'Empresas · Comercial' };

export default async function EmpresasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/empresas');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;
  if (!(await podeGerenciarEmpresas(user.id, orgId))) redirect('/comercial');

  const todas = await listarTodasEmpresas(orgId);

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Empresas</h1>
      </div>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Todas as empresas do Comercial. Exclua as vazias, mova unidades (com suas ações) da empresa
        errada pra certa. Só corporativo/admin vê esta tela.
      </p>
      <EmpresasView inicial={todas} />
    </ComercialShell>
  );
}
