'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X, Trash2, RotateCcw, Plus } from 'lucide-react';
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
  const pendentes = itens.filter((i) => i.status === 'PENDENTE' || i.status === 'PARCIAL');
  const aReceber = itens.reduce((s, i) => s + i.falta, 0);
  const pago = itens.reduce((s, i) => s + (i.valorPago ?? 0), 0);

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
        <Resumo titulo="Falta repassar" valor={aReceber} cor={aReceber > 0 ? 'text-amber-600 dark:text-amber-400' : ''} />
        <Resumo titulo="Já pago" valor={pago} cor="text-emerald-600 dark:text-emerald-400" />
        <Resumo titulo="Repasses em aberto" valor={pendentes.length} contagem />
      </div>

      <div className="space-y-2">
        {itens.map((it) => (
          <RepasseRow key={it.id} it={it} />
        ))}
      </div>
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  cor,
  contagem,
}: {
  titulo: string;
  valor: number;
  cor?: string;
  contagem?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${cor ?? ''}`}>
        {contagem ? valor : fmtMoney(valor, 2)}
      </div>
    </div>
  );
}

function RepasseRow({ it }: { it: RepasseItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = React.useState<{ valor: string; data: string; titulo: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const st = STATUS[it.status];
  const pago = it.valorPago ?? 0;

  async function req(body: Record<string, unknown>, method: 'PATCH' | 'DELETE' = 'PATCH'): Promise<boolean> {
    setBusy(true);
    const res = await fetch('/api/comercial/repasses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast(d.error || 'Não consegui salvar.', 'erro');
      return false;
    }
    router.refresh();
    return true;
  }

  async function pagar() {
    if (!form) return;
    if (await req({ acao: 'pagar', id: it.id, valor: Number(form.valor), data: form.data })) {
      setForm(null);
      toast('Pagamento registrado.');
    }
  }
  async function removerParcela(pagamentoId: string) {
    if (!confirm('Remover esta parcela? A entrada correspondente no caixa também sai.')) return;
    if (await req({ acao: 'remover-parcela', pagamentoId })) toast('Parcela removida.');
  }
  async function definirStatus(status: 'NAO_FEITO' | 'PENDENTE') {
    if (status === 'PENDENTE' && it.pagamentos.length > 0) {
      if (!confirm('Reabrir apaga as parcelas registradas e o crédito no caixa. Continuar?')) return;
    }
    if (await req({ acao: 'status', id: it.id, status })) toast('Repasse atualizado.');
  }
  async function removerDaRelacao() {
    if (!confirm('Remover este repasse da relação?')) return;
    if (await req({ id: it.id }, 'DELETE')) toast('Repasse removido.');
  }

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

      {pago > 0 && (
        <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
          Pago <b className="tabular-nums">{fmtMoney(pago, 2)}</b> de {fmtMoney(it.valorSolicitado, 2)}
          {it.falta > 0 && (
            <>
              {' '}
              · falta <b className="tabular-nums text-amber-600 dark:text-amber-400">{fmtMoney(it.falta, 2)}</b>
            </>
          )}
        </div>
      )}

      {it.pagamentos.length > 0 && (
        <div className="mt-2 space-y-1">
          {it.pagamentos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {fmtDia(p.data)} — <b className="tabular-nums text-foreground">{fmtMoney(p.valor, 2)}</b>
              </span>
              <button
                type="button"
                onClick={() => removerParcela(p.id)}
                disabled={busy}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                title="Remover parcela"
                aria-label="Remover parcela"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <p className="text-xs font-bold text-muted-foreground sm:col-span-2">{form.titulo}</p>
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">Valor enviado (R$)</span>
            <input
              type="number"
              inputMode="decimal"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className={INP}
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">Data do envio</span>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className={INP}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={pagar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {!form && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(it.status === 'PENDENTE' || it.status === 'NAO_FEITO') && (
            <button
              type="button"
              onClick={() => setForm({ valor: String(it.valorSolicitado), data: hoje(), titulo: 'Registrar pagamento' })}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              Registrar pagamento
            </button>
          )}
          {it.status === 'PARCIAL' && (
            <button
              type="button"
              onClick={() => setForm({ valor: String(it.falta), data: hoje(), titulo: 'Complemento do repasse' })}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" /> Complemento
            </button>
          )}
          {it.status === 'PENDENTE' && (
            <button
              type="button"
              onClick={() => definirStatus('NAO_FEITO')}
              disabled={busy}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
            >
              Não feito
            </button>
          )}
          {(it.status === 'FEITO' || it.status === 'PARCIAL' || it.status === 'NAO_FEITO') && (
            <button
              type="button"
              onClick={() => definirStatus('PENDENTE')}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reabrir
            </button>
          )}
          <button
            type="button"
            onClick={removerDaRelacao}
            disabled={busy}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
            title="Remover da relação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
