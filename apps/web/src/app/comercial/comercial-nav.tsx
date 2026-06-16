'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, Wallet, Building2, Tags, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITENS = [
  { href: '/comercial', label: 'Painel', icon: BarChart3, exact: true },
  { href: '/comercial/acoes', label: 'Ações', icon: ClipboardList },
  { href: '/comercial/relatorios', label: 'Relatórios', icon: Wallet },
  { href: '/comercial/unidades', label: 'Unidades', icon: Building2 },
  { href: '/comercial/tipos', label: 'Tipos', icon: Tags },
];

export function ComercialNav({ podeGerenciar = false }: { podeGerenciar?: boolean }) {
  const path = usePathname();
  const itens = podeGerenciar
    ? [...ITENS, { href: '/comercial/equipe', label: 'Equipe', icon: UserCog, exact: false }]
    : ITENS;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      {itens.map((it) => {
        const ativo = it.exact ? path === it.href : path.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-sm font-semibold transition-colors',
              ativo
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
