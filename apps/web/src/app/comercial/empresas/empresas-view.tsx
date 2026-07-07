'use client';

import * as React from 'react';
import { Building, Trash2, ArrowRightLeft, Loader2, X, Check } from 'lucide-react';
import { useToast } from '@/components/toast';
import type { EmpresaAdmin } from '@/lib/comercial';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

export function EmpresasView({ inicial }: { inicial: EmpresaAdmin[] }) {
  const { toast } = useToast();
  const [empresas, setEmpresas] = React.useState<EmpresaAdmin[]>(inicial);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [mover, setMover] = React.useState<{ unidadeId: string; unidadeNome: string; origemId: string } | null>(null);

  async function recarregar() {
    const r = await fetch('/api/comercial/empresas');
    if (r.ok) {
      const d: { empresas: EmpresaAdmin[] } = await r.json();
      setEmpresas(d.empresas);
    }
  }

  async function excluir(e: EmpresaAdmin) {
    if (!window.confirm(`Excluir a empresa "${e.nome}"? Isso é irreversível.`)) return;
    setBusyId(e.id);
    try {
      const r = await fetch('/api/comercial/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'excluir', empresaId: e.id }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        toast(d?.error ?? 'Não consegui excluir.', 'erro');
        return;
      }
      toast('Empresa excluída.');
      await recarregar();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {empresas.map((e) => (
        <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Building className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-bold">{e.nome}</span>
                {e.ehAtual && (
                  <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    atual
                  </span>
                )}
                {e.vazia && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    vazia
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                dono: {e.donoEmail} · {e.unidades} unidade(s) · {e.acoes} ação(ões) · {e.acessos} acesso(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => excluir(e)}
              disabled={!e.vazia || e.ehAtual || busyId === e.id}
              title={
                e.ehAtual
                  ? 'Não dá pra excluir a empresa que você está usando agora'
                  : !e.vazia
                    ? 'A empresa tem unidades/ações — mova os dados antes'
                    : 'Excluir empresa vazia'
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busyId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Excluir
            </button>
          </div>

          {e.unidadesList.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3">
              {e.unidadesList.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-semibold">{u.nome}</span>{' '}
                    <span className="text-xs text-muted-foreground">· {u.acoes} ação(ões)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMover({ unidadeId: u.id, unidadeNome: u.nome, origemId: e.id })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Mover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {mover && (
        <MoverUnidadeModal
          unidadeNome={mover.unidadeNome}
          unidadeId={mover.unidadeId}
          destinos={empresas.filter((e) => e.id !== mover.origemId)}
          onClose={() => setMover(null)}
          onDone={async () => {
            setMover(null);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

function MoverUnidadeModal({
  unidadeNome,
  unidadeId,
  destinos,
  onClose,
  onDone,
}: {
  unidadeNome: string;
  unidadeId: string;
  destinos: EmpresaAdmin[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [destinoOrgId, setDestinoOrgId] = React.useState(destinos[0]?.id ?? '');
  const [busy, setBusy] = React.useState(false);

  async function salvar() {
    if (!destinoOrgId) return;
    setBusy(true);
    try {
      const r = await fetch('/api/comercial/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'mover-unidade', unidadeId, destinoOrgId }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        toast(d?.error ?? 'Não consegui mover.', 'erro');
        return;
      }
      toast('Unidade movida.');
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Mover unidade · {unidadeNome}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          A unidade vai pra empresa escolhida <b>com todas as ações, caixa e repasses</b>.
        </p>
        <label className="flex flex-col text-xs font-semibold text-muted-foreground">
          Empresa destino
          {destinos.length === 0 ? (
            <span className="mt-1 text-sm text-muted-foreground">Não há outra empresa pra onde mover.</span>
          ) : (
            <select value={destinoOrgId} onChange={(e) => setDestinoOrgId(e.target.value)} className={`mt-1 ${INP}`}>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          )}
        </label>
        <button
          type="button"
          onClick={salvar}
          disabled={busy || !destinoOrgId}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Mover unidade
        </button>
      </div>
    </div>
  );
}
