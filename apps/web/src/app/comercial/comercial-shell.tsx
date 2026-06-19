import Link from 'next/link';
import { Compass } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ComercialNav } from './comercial-nav';
import { EmpresaSelector } from './empresa-selector';
import { getSessionUser } from '@/lib/workspace';
import { resolverAcessoComercial } from '@/lib/comercial-acessos';
import type { EmpresaInfo } from '@/lib/comercial';

/** Casca padrão das telas do módulo Comercial (header + seletor de empresa + abas). */
export async function ComercialShell({
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
  // Aba Repasses só p/ corporativo — resolvido aqui pra valer em todas as telas.
  const user = await getSessionUser();
  const acesso = user ? await resolverAcessoComercial(user.id, empresaAtualId) : null;
  const podeRepasse = !!acesso?.corporativo;

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
        <ComercialNav podeGerenciar={podeGerenciar} podeRepasse={podeRepasse} />
      </div>

      <section className="container py-7">{children}</section>
    </main>
  );
}
