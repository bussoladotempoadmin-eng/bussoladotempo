'use client';

import * as React from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/toast';

/**
 * Botão de exportar do relatório. Para corporativo, abre um modal que pergunta
 * se deve salvar na relação de repasse (com a data prevista). Para os demais,
 * baixa o CSV direto.
 */
export function ExportarRelatorio({
  expHref,
  orgId,
  de,
  ate,
  podeRepasse,
}: {
  expHref: string;
  orgId: string;
  de: string;
  ate: string;
  podeRepasse: boolean;
}) {
  const { toast } = useToast();
  const [aberto, setAberto] = React.useState(false);
  const [dataPrevista, setDataPrevista] = React.useState(ate);
  const [busy, setBusy] = React.useState(false);

  function baixar() {
    window.location.assign(expHref);
  }

  async function salvarEbaixar() {
    if (!dataPrevista) return toast('Informe a data prevista do repasse.', 'erro');
    setBusy(true);
    const res = await fetch('/api/comercial/repasses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, de, ate, dataPrevista }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error || 'Não consegui salvar o repasse.', 'erro');
    toast(`${d.count} repasse(s) salvos na relação.`);
    setAberto(false);
    baixar();
  }

  if (!podeRepasse) {
    return (
      <a
        href={expHref}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-sm font-bold text-primary"
      >
        <Download className="h-4 w-4" />
        Exportar CSV
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-sm font-bold text-primary"
      >
        <Download className="h-4 w-4" />
        Exportar CSV
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAberto(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Salvar na relação de repasse?</h2>
              <button onClick={() => setAberto(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Cria um repasse por unidade com o <b>valor solicitado</b> do período. Depois você marca um a um como
              feito/pago na aba <b>Repasses</b>, e o valor é creditado no caixa da unidade.
            </p>

            <label className="mt-4 flex flex-col">
              <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Data prevista do repasse
              </span>
              <input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={salvarEbaixar}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Salvar repasse e baixar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  baixar();
                }}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Só baixar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
