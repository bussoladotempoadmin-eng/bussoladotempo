import Link from 'next/link';
import { listarParceiros } from '@/lib/comissoes';
import { fmtMoney } from '../fmt';
import { NovoParceiroButton } from './novo-parceiro';

export const dynamic = 'force-dynamic';

export default async function ParceirosPage() {
  const parceiros = await listarParceiros();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Parceiros ({parceiros.length})</h1>
        <NovoParceiroButton />
      </div>

      {parceiros.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum parceiro ainda. Crie um pra começar o programa de indicação.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {parceiros.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/parceiros/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.nome}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{p.code}</span>
                    {!p.ativo && <span className="shrink-0 text-[10px] text-muted-foreground">inativo</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.clientesAtivos} cliente{p.clientesAtivos === 1 ? '' : 's'} ativo{p.clientesAtivos === 1 ? '' : 's'}
                    {p.email ? ` · ${p.email}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(p.somaDisponivel)} a pagar</div>
                  <div className="text-muted-foreground">{fmtMoney(p.somaPendente)} em carência</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
