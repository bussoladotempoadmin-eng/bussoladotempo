import Link from 'next/link';
import { Compass } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ComercialNav } from './comercial-nav';

/** Casca padrão das telas do módulo Comercial (header + abas). */
export function ComercialShell({
  orgNome,
  children,
}: {
  orgNome: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>
            Bússola <span className="text-muted-foreground">Comercial</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="container">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {orgNome}
        </p>
        <ComercialNav />
      </div>

      <section className="container py-7">{children}</section>
    </main>
  );
}
