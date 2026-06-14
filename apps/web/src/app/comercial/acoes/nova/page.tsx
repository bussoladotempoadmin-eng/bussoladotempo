import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getEscopoComercial, listarTipos, OBJETIVOS } from '@/lib/comercial';
import { ComercialShell } from '../../comercial-shell';
import { AcaoForm } from '../acao-form';

export const metadata = { title: 'Nova ação · Comercial' };

export default async function NovaAcaoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/acoes/nova');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const escopo = await getEscopoComercial(user.id);
  if (!escopo) redirect('/comercial');
  if (escopo.unidades.length === 0) redirect('/comercial/unidades');

  const tipos = await listarTipos(escopo.org.id);

  return (
    <ComercialShell orgNome={escopo.org.nome}>
      <Link
        href="/comercial/acoes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar pras ações
      </Link>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Nova ação</h1>
      <AcaoForm
        unidades={escopo.unidades.map((u) => ({ id: u.id, nome: u.nome }))}
        tipos={tipos}
        objetivos={OBJETIVOS}
      />
    </ComercialShell>
  );
}
