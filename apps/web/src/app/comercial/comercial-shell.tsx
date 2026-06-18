import Link from 'next/link';
import { Compass } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ComercialNav } from './comercial-nav';
import { EmpresaSelector } from './empresa-selector';
import type { EmpresaInfo } from '@/lib/comercial';

/** Casca padrão das telas do módulo Comercial (header + seletor de empresa + abas). */
export function ComercialShell({
  empresas,
  empresaAtualId,
  podeGerenciar = false,
  children,
}: {
  empresas: EmpresaInfo[];
  empresaAtualId: string;
  podeGerenciar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold lg:hidden">
          <Compass className="h-6 w-6 text-primary" />
          <span>
            Bússola <span className="text-muted-foreground">Comercial</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <EmpresaSelector empresas={empresas} atualId={empresaAtualId} />
          <ThemeToggle className="lg:hidden" />
          <UserMenu className="lg:hidden" />
        </div>
      </header>

      <div className="container">
        <ComercialNav podeGerenciar={podeGerenciar} />
      </div>

      <section className="container py-7">{children}</section>
    </main>
  );
}
