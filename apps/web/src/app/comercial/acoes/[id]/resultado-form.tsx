'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import type { StatusAcao } from '@bussola/db';
import { fmtMoney } from '../../fmt';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

const STATUS: { v: StatusAcao; label: string }[] = [
  { v: 'FINALIZADO', label: 'Finalizado' },
  { v: 'EM_PLANEJAMENTO', label: 'Em planejamento' },
  { v: 'ADIADO', label: 'Adiado' },
  { v: 'CANCELADO', label: 'Cancelado' },
];

export function ResultadoForm({
  acaoId,
  valorSolicitado,
  resultados,
  inicial,
}: {
  acaoId: string;
  valorSolicitado: number | null;
  resultados: readonly string[];
  inicial: {
    status: StatusAcao;
    resultado: string | null;
    resultadoQtd: number | null;
    valorGasto: number | null;
    comentarios: string | null;
  };
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<StatusAcao>(inicial.status);
  const [resultado, setResultado] = React.useState(inicial.resultado ?? resultados[0]);
  const [qtd, setQtd] = React.useState(inicial.resultadoQtd?.toString() ?? '');
  const [gasto, setGasto] = React.useState(inicial.valorGasto?.toString() ?? '');
  const [coment, setComent] = React.useState(inicial.comentarios ?? '');
  const [busy, setBusy] = React.useState(false);
  const [ok, setOk] = React.useState(false);

  const gastoNum = gasto === '' ? null : Number(gasto);
  const diff = valorSolicitado !== null && gastoNum !== null ? gastoNum - valorSolicitado : null;

  async function salvar() {
    setBusy(true);
    setOk(false);
    const r = await fetch(`/api/comercial/acoes/${acaoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'resultado',
        status,
        resultado,
        resultadoQtd: qtd === '' ? null : Number(qtd),
        valorGasto: gastoNum,
        comentarios: coment,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setOk(true);
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        O que aconteceu na ação
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusAcao)} className={INP}>
            {STATUS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Resultado</span>
          <select value={resultado} onChange={(e) => setResultado(e.target.value)} className={INP}>
            {resultados.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Resultado quantitativo
          </span>
          <input type="number" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Ex: 38 leads" className={INP} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Valor gasto (R$)</span>
          <input type="number" inputMode="decimal" value={gasto} onChange={(e) => setGasto(e.target.value)} placeholder="0,00" className={INP} />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-4 py-2.5 text-sm font-semibold">
        <span>
          Solicitado {fmtMoney(valorSolicitado)} → gasto {fmtMoney(gastoNum)}
        </span>
        {diff === null ? (
          <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted-foreground">—</span>
        ) : diff <= 0 ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {diff === 0 ? 'bateu ✓' : `economia ${fmtMoney(-diff)}`}
          </span>
        ) : (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
            +{fmtMoney(diff)} alterado
          </span>
        )}
      </div>

      <label className="mt-4 flex flex-col">
        <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Comentários / observações
        </span>
        <textarea value={coment} onChange={(e) => setComent(e.target.value)} rows={3} placeholder="Como foi, próximos passos, contato firmado..." className={INP} />
      </label>

      <button
        type="button"
        onClick={salvar}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {ok ? 'Salvo!' : 'Salvar resultado'}
      </button>
    </div>
  );
}
