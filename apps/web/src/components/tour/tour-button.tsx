'use client';

import { HelpCircle } from 'lucide-react';
import { abrirTour } from './tour-bus';

/** Botão "?" no topo de uma tela — abre o tour daquela tela. */
export function TourButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => abrirTour()}
      aria-label="Rever tour desta tela"
      title="Rever tour"
      className={
        className ??
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      }
    >
      <HelpCircle className="h-[18px] w-[18px]" />
    </button>
  );
}

/** Item de texto (ex.: nas Configurações) — abre o tour de uma rota específica. */
export function ReverTourButton({ rota, label, className }: { rota?: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => abrirTour(rota)}
      className={className ?? 'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted'}
    >
      <HelpCircle className="h-4 w-4" />
      {label ?? 'Rever tour guiado'}
    </button>
  );
}
