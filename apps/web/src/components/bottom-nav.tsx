'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, CalendarDays, ClipboardCheck, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITENS = [
  { href: '/', label: 'Hoje', icon: Home, match: (p: string) => p === '/' },
  { href: '/semana', label: 'Semana', icon: CalendarDays, match: (p: string) => p.startsWith('/semana') },
  { href: '/revisao', label: 'Revisão', icon: ClipboardCheck, match: (p: string) => p.startsWith('/revisao') || p.startsWith('/espelho') },
  { href: '/comercial', label: 'Comercial', icon: Briefcase, match: (p: string) => p.startsWith('/comercial') },
];

// Rotas onde a barra NÃO aparece (fluxos de entrada / tela cheia).
const OCULTAR = ['/login', '/onboarding', '/auth'];

export function BottomNav() {
  const path = usePathname();
  const { status } = useSession();

  if (status !== 'authenticated') return null;
  if (OCULTAR.some((r) => path.startsWith(r))) return null;

  return (
    <>
      {/* espaçador no fluxo pra conteúdo não ficar atrás da barra */}
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {ITENS.map((it) => {
            const ativo = it.match(path);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors',
                  ativo ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', ativo && 'scale-110')} strokeWidth={ativo ? 2.5 : 2} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
