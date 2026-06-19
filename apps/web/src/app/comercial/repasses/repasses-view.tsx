'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X, Trash2, RotateCcw, Pencil } from 'lucide-react';
import { useToast } from '@/components/toast';
import type { RepasseItem } from '@/lib/comercial-repasse';
import type { RepasseStatus } from '@bussola/db';
import { fmtMoney } from '../fmt';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDia(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
function periodo(de: string, ate: string): string {
  return de === ate ? fmtDia(de) : `${fmtDia(de)}–${fmtDia(ate)}`;
}

const STATUS: Record<RepasseStatus, { label: string; cls: string }> = {
  PENDENTE: { label: 'Pendente', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  FEITO: { label: 'Feito', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  PARCIAL: { label: 'Parcial', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  NAO_FEITO: { label: 'Não feito', cls: 'bg-red-500/15 text-red-700 dark:text-red-400' },
};

export function RepassesView({ itens }: { itens: RepasseItem[] }) {
  const pendentes = itens.filter((i) => i.status === 'PENDENTE');
  const aReceber = pendentes.reduce((s, i) => s + i.valorSolicitado, 0);
  const pago = itens.reduce((s, i) => s + (i.status === 'FEITO' || i.status === 'PARCIAL' ? i.valorPago ?? 0 : 0), 0);
  const divergencia = itens.reduce((s, i) => s + (i.divergencia ?? 0), 0);

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="font-semibold">Nenhum repasse na relação ainda.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No Relatório, clique em Exportar e escolha “Salvar na relação de repasse”.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Resumo titulo="A repassar (pendente)" valor={aReceber} />
        <Resumo titulo="Já pago" valor={pago} cor="text-emerald-600 dark:text-emerald-400" />
        <Resumo
          titulo="Divergência (pago − solicitado)"
          valor={divergencia}
          cor={divergencia < 0 ? 'text-red-600 dark:text-red-400' : ''}
          sinal
        />
      </div>

      <div className="space-y-2">
        {itens.map((it) => (
          <RepasseRow key={it.id} it={it} />
        ))}
      </div>
    </div>
  );
}

function Resumo({ titulo, valor, cor, sinal }: { titulo: string; valor: number; cor?: string; sinal?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${cor ?? ''}`}>
        {sinal && valor > 0 ? '+' : ''}
        {fmtMoney(valor, 2)}
      </div>
    </div>
  );
}

function RepasseRow({ it }: { it: RepasseItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [modo, setModo] = React.useState<'feito' | 'parcial' | null>(null);
  const [valorPago, setValorPago] = React.useState(String(it.valorPago ?? it.valorSolicitado));
  const [dataPagamento, setDataPagamento] = React.useState(it.dataPagamento ?? hoje());
  const [busy, setBusy] = React.useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch('/api/comercial/repasses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.id, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error || 'Não consegui salvar.', 'erro');
    setModo(null);
    toast('Repasse atualizado.');
    router.refresh();
  }

  async function remover() {
    if (!confirm('Remover este repasse da relação?')) return;
    setBusy(true);
    const res = await fetch('/api/comercial/repasses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.id }),
    });
    setBusy(false);
    if (!res.ok) return toast('Não consegui remover.', 'erro');
    toast('Repasse removido.');
    router.refresh();
  }

  const st = STATUS[it.status];
  const pago = it.status === 'FEITO' || it.status === 'PARCIAL';

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{it.unidadeNome}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Período {periodo(it.periodoDe, it.periodoAte)} · previsto {fmtDia(it.dataPrevista)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums">{fmtMoney(it.valorSolicitado, 2)}</div>
          <div className="text-[11px] text-muted-foreground">solicitado</div>
        </div>
      </div>

      {pago && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2 text-sm">
          <span>
            Pago <b className="tabular-nums">{fmtMoney(it.valorPago, 2)}</b>
            {it.dataPagamento ? ` em ${fmtDia(it.dataPagamento)}` : ''}
          </span>
          {it.divergencia != null && it.divergencia !== 0 && (
            <span className={`font-semibold ${it.divergencia < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {it.divergencia < 0 ? 'Faltou ' : 'Pago a mais '}
              {fmtMoney(Math.abs(it.divergencia), 2)}
            </span>
          )}
        </div>
      )}

      {/* Form de marcação */}
      {modo && (
        <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          {modo === 'parcial' && (
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-semibold text-muted-foreground">Valor pago (R$)</span>
              <input type="number" inputMode="decimal" value={valorPago} onChange={(e) => setValorPago(e.target.value)} className={INP} />
            </label>
          )}
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">Data do pagamento</span>
            <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} className={INP} />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                patch({
                  status: modo === 'feito' ? 'FEITO' : 'PARCIAL',
                  dataPagamento,
                  valorPago: modo === 'parcial' ? Number(valorPago) : undefined,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar
            </button>
            <button type="button" onClick={() => setModo(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Ações */}
      {!modo && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!pago ? (
            <>
              <button onClick={() => { setValorPago(String(it.valorSolicitado)); setDataPagamento(hoje()); setModo('feito'); }} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                Feito / pago
              </button>
              <button onClick={() => { setValorPago(String(it.valorSolicitado)); setDataPagamento(hoje()); setModo('parcial'); }} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60">
                Pago parcial
              </button>
              <button onClick={() => patch({ status: 'NAO_FEITO' })} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60">
                Não feito
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setValorPago(String(it.valorPago ?? it.valorSolicitado)); setDataPagamento(it.dataPagamento ?? hoje()); setModo('parcial'); }} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60">
                <Pencil className="h-3.5 w-3.5" /> Editar valor
              </button>
              <button onClick={() => patch({ status: 'PENDENTE' })} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-60">
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir
              </button>
            </>
          )}
          <button onClick={remover} disabled={busy} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60" title="Remover da relação">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
