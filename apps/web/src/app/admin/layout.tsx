import Link from 'next/link';
import { Compass } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { requireSuperAdmin } from '@/lib/super-admin';

export const metadata = { title: 'Gestão · Bússola do Tempo' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  const nav = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/contas', label: 'Contas' },
    { href: '/admin/planos', label: 'Planos' },
    { href: '/admin/cupons', label: 'Cupons' },
    { href: '/admin/parceiros', label: 'Parceiros' },
  ];

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-5">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>
            Bússola <span className="text-muted-foreground font-normal">· Gestão</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <nav className="container flex flex-wrap gap-2 border-b border-border pb-3">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="container py-6">{children}</div>
    </main>
  );
}
