'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, ArrowRightLeft, PenLine, Loader2, X } from 'lucide-react';
import type { AcaoListItem } from '@/lib/comercial';
import { fmtMoney, fmtNum, fmtPeriodo } from '../fmt';

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  EM_PLANEJAMENTO: { label: 'Em planejamento', cls: 'bg-muted text-muted-foreground' },
  FINALIZADO: { label: 'Finalizado', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  ADIADO: { label: 'Adiado', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  CANCELADO: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
};

function verbaPill(solicitado: number | null, gasto: number | null) {
  if (gasto === null) return { txt: 'aguardando', cls: 'bg-muted text-muted-foreground' };
  if (solicitado === null) return { txt: fmtMoney(gasto), cls: 'bg-muted text-muted-foreground' };
  if (gasto < solicitado) return { txt: 'economia', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  if (gasto === solicitado) return { txt: 'bateu ✓', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  return { txt: `+${fmtMoney(gasto - solicitado)}`, cls: 'bg-red-500/15 text-red-600 dark:text-red-400' };
}

type UnidadeOpt = { id: string; nome: string };

export function AcoesTable({ acoes, unidades }: { acoes: AcaoListItem[]; unidades: UnidadeOpt[] }) {
  const [modal, setModal] = React.useState<{ tipo: 'reagendar' | 'realocar'; acao: AcaoListItem } | null>(null);

  if (acoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="font-semibold">Nenhuma ação no período/filtro.</p>
        <Link
          href="/comercial/acoes/nova"
          className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + Nova ação
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {acoes.map((a) => {
          const st = STATUS_STYLE[a.status];
          const vp = verbaPill(a.valorSolicitado, a.valorGasto);
          return (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                    {a.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.unidadeNome}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
              </div>

              <p className="mt-2 text-base font-bold">{a.local}</p>
              <p className="text-xs text-muted-foreground">
                🎯 {a.objetivo}
                {a.responsaveis && ` · 👥 ${a.responsaveis}`} · 📅 {fmtPeriodo(a.dataInicio, a.dataFim)}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-dashed border-border pt-3 text-sm">
                <Kv label="Solicitado" valor={fmtMoney(a.valorSolicitado)} />
                <Kv label="Gasto" valor={fmtMoney(a.valorGasto)} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Verba</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${vp.cls}`}>{vp.txt}</span>
                </div>
                <Kv label="Leads" valor={fmtNum(a.resultadoQtd)} cor="text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/comercial/acoes/${a.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Registrar resultado
                </Link>
                <button
                  type="button"
                  onClick={() => setModal({ tipo: 'reagendar', acao: a })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Reagendar
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ tipo: 'realocar', acao: a })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Realocar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal?.tipo === 'reagendar' && (
        <ReagendarModal acao={modal.acao} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'realocar' && (
        <RealocarModal acao={modal.acao} unidades={unidades} onClose={() => setModal(null)} />
      )}
    </>
  );
}

function Kv({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label} </span>
      <span className={`font-bold ${cor ?? ''}`}>{valor}</span>
    </div>
  );
}

function Shell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

function ReagendarModal({ acao, onClose }: { acao: AcaoListItem; onClose: () => void }) {
  const router = useRouter();
  const [ini, setIni] = React.useState(acao.dataInicio);
  const [fim, setFim] = React.useState(acao.dataFim);
  const [busy, setBusy] = React.useState(false);

  async function salvar() {
    setBusy(true);
    await fetch(`/api/comercial/acoes/${acao.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'reagendar', dataInicio: ini, dataFim: fim || ini }),
    });
    onClose();
    router.refresh();
  }

  return (
    <Shell title={`Reagendar · ${acao.local}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-xs font-semibold text-muted-foreground">
          Início
          <input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className={`mt-1 ${INP}`} />
        </label>
        <label className="flex flex-col text-xs font-semibold text-muted-foreground">
          Fim
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={`mt-1 ${INP}`} />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">A ação volta pra &ldquo;Em planejamento&rdquo;.</p>
      <button
        type="button"
        onClick={salvar}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
        Salvar nova data
      </button>
    </Shell>
  );
}

function RealocarModal({
  acao,
  unidades,
  onClose,
}: {
  acao: AcaoListItem;
  unidades: UnidadeOpt[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [unidadeId, setUnidadeId] = React.useState(acao.unidadeId);
  const [resp, setResp] = React.useState(acao.responsaveis);
  const [busy, setBusy] = React.useState(false);

  async function salvar() {
    setBusy(true);
    await fetch(`/api/comercial/acoes/${acao.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'realocar', unidadeId, responsaveis: resp }),
    });
    onClose();
    router.refresh();
  }

  return (
    <Shell title={`Realocar · ${acao.local}`} onClose={onClose}>
      <label className="flex flex-col text-xs font-semibold text-muted-foreground">
        Unidade
        <select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} className={`mt-1 ${INP}`}>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col text-xs font-semibold text-muted-foreground">
        Responsáveis
        <input value={resp} onChange={(e) => setResp(e.target.value)} className={`mt-1 ${INP}`} placeholder="Ex: Mariana, Regina" />
      </label>
      <button
        type="button"
        onClick={salvar}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
        Mover ação
      </button>
    </Shell>
  );
}
