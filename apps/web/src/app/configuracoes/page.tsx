import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';
import { ConfiguracoesForm, type WorkspaceDTO } from './configuracoes-form';

export const metadata = { title: 'Configurações · Bússola do Tempo' };

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/configuracoes');

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect('/login');

  const dto: WorkspaceDTO = {
    nome: workspace.nome,
    timezone: workspace.timezone,
    semanaInicio: workspace.semanaInicio,
    horaAcordar: workspace.horaAcordar,
    horaDormir: workspace.horaDormir,
    horaAlmocoIni: workspace.horaAlmocoIni,
    horaAlmocoFim: workspace.horaAlmocoFim,
  };

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <section className="container max-w-xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus horários de rotina. É com base neles que a agenda padrão decide onde
          encaixar os blocos.
        </p>

        <div className="mt-8">
          <ConfiguracoesForm initial={dto} />
        </div>
      </section>
    </main>
  );
}
