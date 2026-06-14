import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getTimeGestor } from '@/lib/equipe';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';
import { TimeView } from './time-view';

export const metadata = { title: 'Meu time · Bússola do Tempo' };

export default async function TimePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/time');

  const user = await getSessionUser();
  const time = user ? await getTimeGestor(user.id) : null;

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

      <section className="container max-w-3xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Meu time</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Monte seu time e acompanhe onde o tempo de cada um está indo. Cada pessoa é dona
          da própria agenda — você enxerga o tempo e orienta, sem invadir as reflexões.
        </p>

        <div className="mt-8">
          <TimeView inicial={time} />
        </div>
      </section>
    </main>
  );
}
