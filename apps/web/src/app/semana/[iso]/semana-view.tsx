'use client';

import * as React from 'react';
import { List, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlocosManager, type BlocoDTO, type FrenteOption } from './blocos-manager';
import { BlocosCalendario } from './blocos-calendario';
import { BlocoModal } from './bloco-modal';
import { useBlocoMutations } from './use-bloco-mutations';

export function SemanaView({
  semanaIso,
  initialBlocos,
  frentes,
  mondayISO,
}: {
  semanaIso: string;
  initialBlocos: BlocoDTO[];
  frentes: FrenteOption[];
  mondayISO: string;
}) {
  const [blocos, setBlocos] = React.useState<BlocoDTO[]>(initialBlocos);
  const [view, setView] = React.useState<'lista' | 'calendario'>('lista');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const mut = useBlocoMutations(setBlocos);

  const selectedBloco = selectedId ? blocos.find((b) => b.id === selectedId) ?? null : null;
  const frenteDoSelecionado = selectedBloco
    ? frentes.find((f) => f.id === selectedBloco.frenteId)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setView('lista')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
            view === 'lista' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <List className="h-4 w-4" />
          Lista
        </button>
        <button
          type="button"
          onClick={() => setView('calendario')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
            view === 'calendario' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Calendário
        </button>
      </div>

      {view === 'lista' ? (
        <BlocosManager semanaIso={semanaIso} blocos={blocos} setBlocos={setBlocos} frentes={frentes} />
      ) : (
        <BlocosCalendario
          blocos={blocos}
          setBlocos={setBlocos}
          frentes={frentes}
          mondayISO={mondayISO}
          onSelectBloco={setSelectedId}
        />
      )}

      {selectedBloco && (
        <BlocoModal
          bloco={selectedBloco}
          frente={frenteDoSelecionado}
          frentes={frentes}
          mut={mut}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
