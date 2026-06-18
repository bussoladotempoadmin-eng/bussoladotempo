'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  Compass,
  Home,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Users,
  Briefcase,
  Moon,
  Sun,
  CreditCard,
  Settings,
  ShieldCheck,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { abrirTour } from './tour/tour-bus';

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
};

const ITENS: Item[] = [
  { href: '/', label: 'Hoje', icon: Home, match: (p) => p === '/' },
  { href: '/frentes', label: 'Minhas frentes', icon: Compass, match: (p) => p.startsWith('/frentes') },
  { href: '/compromissos', label: 'Compromissos fixos', icon: CalendarClock, match: (p) => p.startsWith('/compromissos') },
  { href: '/semana', label: 'Semana atual', icon: CalendarDays, match: (p) => p.startsWith('/semana') },
  { href: '/revisao', label: 'Revisão da semana', icon: ClipboardCheck, match: (p) => p.startsWith('/revisao') || p.startsWith('/espelho') },
  { href: '/time', label: 'Meu time', icon: Users, match: (p) => p.startsWith('/time') },
  { href: '/comercial', label: 'Comercial', icon: Briefcase, match: (p) => p.startsWith('/comercial') },
  { href: '/noite', label: 'Fechamento da noite', icon: Moon, match: (p) => p.startsWith('/noite') },
  { href: '/meu-plano', label: 'Meu plano', icon: CreditCard, match: (p) => p.startsWith('/meu-plano') },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, match: (p) => p.startsWith('/configuracoes') },
];

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === 'dark' : true;
  const nome = session?.user?.name ?? session?.user?.email ?? 'Você';
  const initials =
    session?.user?.name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[68px]' : 'w-[236px]',
      )}
    >
      {/* Topo: marca + recolher */}
      <div className={cn('flex items-center gap-2 px-3 py-4', collapsed && 'justify-center px-0')}>
        <Link
          href="/"
          className={cn('flex min-w-0 items-center gap-2 font-bold', collapsed && 'justify-center')}
          title="Bússola do Tempo"
        >
          <Compass className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && <span className="truncate">Bússola do Tempo</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expandir menu"
          title="Expandir menu"
          className="mx-auto mb-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {ITENS.map((it) => {
          const ativo = it.match(path);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              title={collapsed ? it.label : undefined}
              className={cn(
                'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                collapsed && 'justify-center px-0',
                ativo
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </Link>
          );
        })}
        {session?.user?.superAdmin && (
          <Link
            href="/admin"
            title={collapsed ? 'Gestão do produto' : undefined}
            className={cn(
              'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted',
              collapsed && 'justify-center px-0',
            )}
          >
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">Gestão do produto</span>}
          </Link>
        )}
      </nav>

      {/* Rodapé: tema, ajuda, usuário */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={collapsed ? (isDark ? 'Modo claro' : 'Modo escuro') : undefined}
          className={cn(
            'mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {isDark ? <Sun className="h-[18px] w-[18px] shrink-0" /> : <Moon className="h-[18px] w-[18px] shrink-0" />}
          {!collapsed && <span className="truncate">{isDark ? 'Modo claro' : 'Modo escuro'}</span>}
        </button>

        <button
          type="button"
          onClick={() => abrirTour()}
          title={collapsed ? 'Ajuda / tour' : undefined}
          className={cn(
            'mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          <HelpCircle className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">Ajuda / tour</span>}
        </button>

        <Link
          href="/perfil"
          title={collapsed ? nome : undefined}
          className={cn(
            'mt-1 flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nome}</span>}
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
