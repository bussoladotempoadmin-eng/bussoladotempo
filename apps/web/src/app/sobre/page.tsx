import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, Target, Flame, Wind, LayoutGrid, MessageCircleHeart } from 'lucide-react';

export const metadata = {
  title: 'Sobre · Bússola do Tempo',
  description:
    'A Bússola do Tempo cruza suas frentes de trabalho com 3 categorias — Importante, Urgente e Disperso — pra mostrar, com números, onde seu tempo realmente foi.',
};

export default function SobrePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-frente-doctum-soft blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-frente-tribo-soft blur-3xl" />
      </div>

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

      <section className="container flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Onde seu tempo <span className="text-primary">realmente foi</span>?
        </h1>
        <p className="max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          Quase todo app de produtividade te ajuda a planejar. Quase nenhum te mostra a
          verdade do que aconteceu. A Bússola do Tempo é o espelho: ela cruza suas
          frentes de trabalho com 3 categorias e revela, com números, como sua semana se
          distribuiu de verdade.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md"
        >
          Entrar
        </Link>
      </section>

      <section className="container max-w-4xl pb-12">
        <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
          As 3 categorias da Bússola
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Categoria
            icon={<Target className="h-6 w-6" />}
            titulo="🎯 Importante"
            cor="text-triade-importante"
            bg="bg-triade-importante-soft"
            texto="O que move sua estratégia no longo prazo. Onde você decide, não reage."
          />
          <Categoria
            icon={<Flame className="h-6 w-6" />}
            titulo="🔥 Urgente"
            cor="text-triade-urgente"
            bg="bg-triade-urgente-soft"
            texto="O que pega fogo e exige resposta agora. Necessário às vezes, perigoso em excesso."
          />
          <Categoria
            icon={<Wind className="h-6 w-6" />}
            titulo="💨 Disperso"
            cor="text-triade-disperso"
            bg="bg-triade-disperso-soft"
            texto="O que pareceu trabalho mas não gerou resultado. O tempo mais fácil de recuperar."
          />
        </div>
      </section>

      <section className="container max-w-4xl pb-20">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Recurso
            icon={<LayoutGrid className="h-5 w-5 text-primary" />}
            titulo="O Espelho"
            texto="A matriz Frente × Categoria que nenhum outro app cruza. Veja, semana a semana, quanto de cada frente foi Importante, Urgente ou Disperso."
          />
          <Recurso
            icon={<MessageCircleHeart className="h-5 w-5 text-primary" />}
            titulo="O Coach Gentil"
            texto="Insights em linguagem humana que leem seu espelho e sugerem um próximo passo concreto — sem culpa, sem moralismo."
          />
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        Bússola do Tempo · feito por Lucas Silveira
      </footer>
    </main>
  );
}

function Categoria({
  icon,
  titulo,
  texto,
  cor,
  bg,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
  cor: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-left">
      <div className={`inline-flex rounded-xl ${bg} ${cor} p-2`}>{icon}</div>
      <h3 className={`mt-3 text-lg font-bold ${cor}`}>{titulo}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function Recurso({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-left">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-bold">{titulo}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
