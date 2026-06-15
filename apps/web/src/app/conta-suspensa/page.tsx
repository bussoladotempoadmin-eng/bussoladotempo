import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { contaBloqueada } from '@/lib/acesso';
import { UserMenu } from '@/components/user-menu';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conta suspensa · Bússola do Tempo' };

export default async function ContaSuspensaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  // Se não está bloqueada, manda de volta pro app.
  const motivo = await contaBloqueada(session.user.id);
  if (!motivo) redirect('/');

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-5">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </div>
        <UserMenu />
      </header>

      <div className="container flex max-w-lg flex-col items-center py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-3xl">⏸️</div>
        <h1 className="text-2xl font-bold">
          {motivo === 'CANCELADA' ? 'Sua conta está cancelada' : 'Seu acesso está pausado'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {motivo === 'CANCELADA'
            ? 'Sua assinatura foi cancelada. Pra voltar a usar a Bússola, fale com a gente que reativamos.'
            : 'Não identificamos o pagamento, então seu acesso ficou pausado. Assim que regularizar, reativamos na hora — seu histórico e suas semanas continuam salvos.'}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a
            href="https://wa.me/5533991393031?text=Ol%C3%A1!%20Quero%20regularizar%20minha%20conta%20na%20B%C3%BAssola%20do%20Tempo."
            target="_blank"
            rel="noopener"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Falar no WhatsApp e regularizar
          </a>
          <Link href="/meu-plano" className="rounded-lg border border-border px-6 py-3 text-sm font-semibold hover:bg-muted">
            Ver meu plano
          </Link>
        </div>
      </div>
    </main>
  );
}
