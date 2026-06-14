import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getEscopoComercial, listarTipos } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { TiposView } from './tipos-view';

export const metadata = { title: 'Tipos de ação · Comercial' };

export default async function TiposPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/tipos');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const escopo = await getEscopoComercial(user.id);
  if (!escopo) redirect('/comercial');

  const tipos = await listarTipos(escopo.org.id);

  return (
    <ComercialShell orgNome={escopo.org.nome}>
      <h1 className="text-2xl font-extrabold tracking-tight">Tipos de ação</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Crie os tipos que fazem sentido pro seu negócio — eles aparecem no formulário de ação e
        viram filtro nos relatórios.
      </p>
      <TiposView inicial={tipos} ehDono={escopo.ehDono} />
    </ComercialShell>
  );
}
