import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getEscopoComercial } from '@/lib/comercial';
import { ComercialShell } from '../comercial-shell';
import { UnidadesView } from './unidades-view';

export const metadata = { title: 'Unidades · Comercial' };

export default async function UnidadesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/unidades');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const escopo = await getEscopoComercial(user.id);
  if (!escopo) redirect('/comercial');

  return (
    <ComercialShell orgNome={escopo.org.nome}>
      <h1 className="text-2xl font-extrabold tracking-tight">Unidades</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        As cidades / unidades do seu setor comercial.
      </p>
      <UnidadesView inicial={escopo.unidades} ehDono={escopo.ehDono} />
    </ComercialShell>
  );
}
