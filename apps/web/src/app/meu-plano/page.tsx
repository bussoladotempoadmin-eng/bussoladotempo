import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@bussola/db';
import { getMinhaAssinatura, garantirAssinatura } from '@/lib/assinatura';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { EscolherPlano } from './escolher-plano';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu plano · Bússola do Tempo' };

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

export default async function MeuPlanoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/meu-plano');

  await garantirAssinatura(session.user.id);
  const [assinatura, planos] = await Promise.all([
    getMinhaAssinatura(session.user.id),
    prisma.plano.findMany({ where: { ativo: true }, orderBy: { precoMensal: 'asc' } }),
  ]);

  const dias =
    assinatura?.status === 'TRIAL' && assinatura.trialTerminaEm
      ? Math.max(0, Math.ceil((assinatura.trialTerminaEm.getTime() - Date.now()) / 86400000))
      : null;

  const ehMembro = !assinatura; // sem assinatura própria = coberto por um time

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="container max-w-4xl py-6">
        <h1 className="text-2xl font-bold">Meu plano</h1>

        {ehMembro ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Seu acesso é parte de um time. A assinatura é gerenciada por quem administra a conta da empresa.
          </p>
        ) : (
          <>
            {/* Status atual */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm text-muted-foreground">Seu plano atual</div>
                  <div className="text-lg font-bold">{assinatura!.plano.nome}</div>
                </div>
                <div className="text-right text-sm">
                  {assinatura!.status === 'TRIAL' && (
                    <span className="rounded-full bg-blue-500/12 px-3 py-1 font-semibold text-blue-600 dark:text-blue-400">
                      Teste grátis{dias != null ? ` · ${dias} dia${dias === 1 ? '' : 's'}` : ''}
                    </span>
                  )}
                  {assinatura!.status === 'ATIVA' && (
                    <span className="rounded-full bg-emerald-500/12 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      Ativo
                    </span>
                  )}
                  {(assinatura!.status === 'ATRASADA' || assinatura!.status === 'SUSPENSA') && (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-600 dark:text-amber-400">
                      Pagamento pendente
                    </span>
                  )}
                </div>
              </div>
              {assinatura!.aguardandoAtivacao && (
                <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  Recebemos sua escolha de plano! 🎉 Em breve a gente entra em contato pra ativar.{' '}
                  <a
                    href="https://wa.me/5533991393031"
                    target="_blank"
                    rel="noopener"
                    className="font-semibold text-primary hover:underline"
                  >
                    Falar agora no WhatsApp
                  </a>
                </p>
              )}
            </div>

            {/* Escolha de plano */}
            <h2 className="mt-8 text-lg font-bold">Escolha seu plano</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No momento a ativação é feita junto com a nossa equipe. Escolha aqui e a gente combina o pagamento com você.
            </p>
            <EscolherPlano
              planoAtualSlug={assinatura!.plano.slug}
              assentosAtuais={assinatura!.assentos}
              planos={planos.map((p) => ({
                slug: p.slug,
                nome: p.nome,
                precoMensal: p.precoMensal,
                precoPorAssento: p.precoPorAssento,
                moduloTimeAtivo: p.moduloTimeAtivo,
                moduloComercialAtivo: p.moduloComercialAtivo,
                precoLabel:
                  p.precoPorAssento > 0 ? `${fmt(p.precoPorAssento)} / acesso · mês` : `${fmt(p.precoMensal)} / mês`,
              }))}
            />
          </>
        )}
      </div>
    </main>
  );
}
