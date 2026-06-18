'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { AppSidebar } from './app-sidebar';

// Rotas onde a sidebar NÃO aparece (entrada / tela cheia / seções com chrome próprio).
const OCULTAR = ['/login', '/cadastro', '/onboarding', '/auth', '/admin', '/conta-suspensa', '/sobre'];

const STORAGE_KEY = 'bdt:sidebar-collapsed';

/**
 * Casca do app no desktop (lg+): sidebar fixa à esquerda + conteúdo deslocado.
 * No mobile não muda nada — a sidebar é `hidden lg:flex` e o padding só vale em lg.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { status } = useSession();
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const oculto =
    status !== 'authenticated' || OCULTAR.some((r) => path === r || path.startsWith(`${r}/`));

  return (
    <>
      {!oculto && <AppSidebar collapsed={collapsed} onToggle={toggle} />}
      <div className={cn(!oculto && (collapsed ? 'lg:pl-[68px]' : 'lg:pl-[236px]'))}>
        {children}
      </div>
    </>
  );
}
