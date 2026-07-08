'use client';

import { Printer, Download, FileText } from 'lucide-react';
import type { LoteRepasse } from '@/lib/comercial-repasse';
import { fmtMoney } from '../fmt';

function fmtDia(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
function periodo(de: string, ate: string): string {
  return de === ate ? fmtDia(de) : `${fmtDia(de)}–${fmtDia(ate)}`;
}

export function LotesView({ lotes }: { lotes: LoteRepasse[] }) {
  if (lotes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="font-semibold">Nenhum relatório de repasse emitido ainda.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vá em <b>Relatórios</b> → Exportar → “Salvar na relação de repasse”. Cada emissão vira um relatório
          aqui, pra reabrir e imprimir quando quiser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lotes.map((l) => {
        const urlPdf = `/api/comercial/repasses/export?lote=${l.loteId}&formato=pdf`;
        const urlXls = `/api/comercial/repasses/export?lote=${l.loteId}&formato=excel`;
        return (
          <div key={l.loteId} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-semibold">Relatório de {fmtDia(l.emitidoEm)}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Período {periodo(l.periodoDe, l.periodoAte)} · previsto {fmtDia(l.dataPrevista)} · {l.unidades}{' '}
                  unidade(s) · {l.pagos} pago(s) / {l.pendentes} pendente(s)
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums">{fmtMoney(l.totalSolicitado, 2)}</div>
                <div className="text-[11px] text-muted-foreground">total</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.open(urlPdf, '_blank')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Printer className="h-3.5 w-3.5" />
                Abrir / Imprimir
              </button>
              <button
                type="button"
                onClick={() => window.open(urlXls, '_blank')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                Planilha
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
