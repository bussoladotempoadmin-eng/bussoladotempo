import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/perfil');
  }

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

      <section className="container max-w-2xl py-12">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Seu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Os dados básicos da sua conta. Em breve, configurações de timezone, horas de
          sono e preferências.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nome
              </dt>
              <dd className="mt-1 text-base">{session.user.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1 text-base">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ID interno
              </dt>
              <dd className="mt-1 font-mono text-xs text-muted-foreground">
                {session.user.id}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
