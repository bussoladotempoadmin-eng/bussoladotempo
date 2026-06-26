'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { AcaoListItem } from '@/lib/comercial';
import { AcaoModal } from './acao-modal';
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

type Opt = { id: string; nome: string };

export function AcoesTable({
  acoes,
  unidades,
  tipos,
  objetivos,
  podeGerenciar = false,
}: {
  acoes: AcaoListItem[];
  unidades: Opt[];
  tipos: Opt[];
  objetivos: readonly string[];
  podeGerenciar?: boolean;
}) {
  const [aberta, setAberta] = React.useState<AcaoListItem | null>(null);

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
            <button
              key={a.id}
              type="button"
              onClick={() => setAberta(a)}
              className="block w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                    {a.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.unidadeNome}</span>
                  {a.travada && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      🔒 Em repasse{a.repasseFechado ? ' · fechado' : ''}
                    </span>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-base font-bold">{a.local}</p>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
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
            </button>
          );
        })}
      </div>

      {aberta && (
        <AcaoModal
          acao={aberta}
          unidades={unidades}
          tipos={tipos}
          objetivos={objetivos}
          podeGerenciar={podeGerenciar}
          onClose={() => setAberta(null)}
        />
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
