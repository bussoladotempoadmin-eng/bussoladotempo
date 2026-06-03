'use client';

import * as React from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User as UserIcon, Compass, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserMenu({ className }: { className?: string }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = React.useState(false);

  if (status === 'loading') {
    return (
      <div
        className={cn('h-10 w-32 animate-pulse rounded-full bg-muted', className)}
        aria-hidden
      />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md',
          className,
        )}
      >
        <LogIn className="h-4 w-4" />
        Entrar
      </Link>
    );
  }

  const initials =
    session.user.name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? session.user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:shadow-md"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden md:inline">{session.user.name ?? session.user.email}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold">{session.user.name ?? 'Usuário'}</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <Link
              href="/frentes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              <Compass className="h-4 w-4" />
              Minhas frentes
            </Link>
            <Link
              href="/compromissos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              <CalendarClock className="h-4 w-4" />
              Compromissos fixos
            </Link>
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              <UserIcon className="h-4 w-4" />
              Meu perfil
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
