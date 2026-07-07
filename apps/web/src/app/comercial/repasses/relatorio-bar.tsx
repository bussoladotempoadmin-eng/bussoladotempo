'use client';

import * as React from 'react';
import { Printer, Download, FileText } from 'lucide-react';

const INP = 'rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export function RelatorioRepasseBar() {
  const [de, setDe] = React.useState('');
  const [ate, setAte] = React.useState('');
  const [status, setStatus] = React.useState('');

  function url(formato: 'pdf' | 'excel') {
    const p = new URLSearchParams();
    if (de) p.set('de', de);
    if (ate) p.set('ate', ate);
    if (status) p.set('status', status);
    p.set('formato', formato);
    return `/api/comercial/repasses/export?${p.toString()}`;
  }

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <FileText className="h-4 w-4 text-primary" />
        Relatório de repasse
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Emite, por unidade, o <b>valor a repassar + os dados da conta</b> configurada na unidade. Filtre por data
        prevista e status.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Previsto de</span>
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={INP} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Até</span>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={INP} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={INP}>
            <option value="">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="FEITO">Feito</option>
            <option value="PARCIAL">Parcial</option>
            <option value="NAO_FEITO">Não feito</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => window.open(url('pdf'), '_blank')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </button>
        <button
          type="button"
          onClick={() => window.open(url('excel'), '_blank')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Planilha
        </button>
      </div>
    </div>
  );
}
