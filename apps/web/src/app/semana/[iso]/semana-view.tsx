'use client';

import * as React from 'react';
import { List, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { blocoUpdateSchema } from '@/lib/schemas/bloco';
import type { DiaSemana } from '@/lib/schemas/compromisso';
import {
  BlocosManager,
  BlocoForm,
  type BlocoDTO,
  type FrenteOption,
  type FormState,
} from './blocos-manager';
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
  const [createInitial, setCreateInitial] = React.useState<FormState | null>(null);
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const mut = useBlocoMutations(setBlocos, semanaIso);

  const selectedBloco = selectedId ? blocos.find((b) => b.id === selectedId) ?? null : null;
  const frenteDoSelecionado = selectedBloco
    ? frentes.find((f) => f.id === selectedBloco.frenteId)
    : undefined;

  function abrirCriacao(slot: { diaSemana: DiaSemana; horaInicio: string; horaFim: string }) {
    setCreateError(null);
    setCreateInitial({
      diaSemana: slot.diaSemana,
      horaInicio: slot.horaInicio,
      horaFim: slot.horaFim,
      tarefa: '',
      frenteId: frentes[0]?.id ?? '',
      categoriaPlanejada: 'IMPORTANTE',
      categoriaRealizada: 'IMPORTANTE',
    });
  }

  async function salvarCriacao(form: FormState) {
    const parsed = blocoUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setCreateBusy(true);
    const ok = await mut.createBloco({
      ...parsed.data,
      categoriaRealizada: parsed.data.categoriaRealizada ?? parsed.data.categoriaPlanejada,
    });
    setCreateBusy(false);
    if (ok) setCreateInitial(null);
    else setCreateError('Não consegui criar o bloco.');
  }

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
          onCreateSlot={abrirCriacao}
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

      {createInitial && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setCreateInitial(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 px-1 text-sm font-bold text-white">Novo bloco</h2>
            {createError && (
              <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            )}
            <BlocoForm
              initial={createInitial}
              frentes={frentes}
              busy={createBusy}
              onSubmit={salvarCriacao}
              onCancel={() => setCreateInitial(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
