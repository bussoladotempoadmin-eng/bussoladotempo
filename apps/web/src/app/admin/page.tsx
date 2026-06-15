import Link from 'next/link';
import { dashboardKPIs } from '@/lib/admin-billing';
import { fmtMoney, STATUS_LABEL } from './fmt';
import { RodarBilling } from './rodar-billing';
import type { StatusAssinatura } from '@bussola/db';

export const dynamic = 'force-dynamic';

const STATUS_ORDEM: StatusAssinatura[] = ['TRIAL', 'ATIVA', 'ATRASADA', 'SUSPENSA', 'CANCELADA'];

function KPI({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{valor}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  const k = await dashboardKPIs();
  const maxHist = Math.max(1, ...k.historicoMrr.map((h) => h.valor));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Visão geral</h1>
        <RodarBilling />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="MRR" valor={fmtMoney(k.mrr)} sub={`mês ${k.mesRef}`} />
        <KPI label="ARR (proj.)" valor={fmtMoney(k.arr)} />
        <KPI label="Novas no mês" valor={String(k.novasNoMes)} />
        <KPI label="Inadimplentes" valor={String(k.inadimplentes)} sub={`${k.alertas.cobrancasVencidas} cobranças vencidas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contas por status */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-semibold">Contas por status</div>
          <ul className="space-y-2">
            {STATUS_ORDEM.map((s) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <Link href={`/admin/contas?status=${s}`} className="text-muted-foreground hover:text-primary">
                  {STATUS_LABEL[s]}
                </Link>
                <span className="font-semibold">{k.porStatus[s]}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* MRR 6 meses */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-semibold">MRR · últimos 6 meses</div>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {k.historicoMrr.map((h) => (
              <div key={h.mes} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.round((h.valor / maxHist) * 96)}px`, minHeight: h.valor > 0 ? 4 : 0 }}
                  title={fmtMoney(h.valor)}
                />
                <span className="text-[10px] text-muted-foreground">{h.mes.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas: trials vencendo */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 text-sm font-semibold">Trials vencendo (≤ 3 dias)</div>
        {k.alertas.trialsVencendo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum trial vencendo nos próximos 3 dias.</p>
        ) : (
          <ul className="divide-y divide-border">
            {k.alertas.trialsVencendo.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/contas/${t.id}`} className="hover:text-primary">
                  {t.nome}
                </Link>
                <span className="text-muted-foreground">
                  {t.dias === 0 ? 'vence hoje' : `${t.dias} dia${t.dias > 1 ? 's' : ''}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
