'use client';

import * as React from 'react';
import { List, CalendarDays, Eye, EyeOff, Link2, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
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
import { BlocosCalendario, type GoogleOverlay } from './blocos-calendario';
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
  const [calView, setCalView] = React.useState<'week' | 'day' | 'month'>('week');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createInitial, setCreateInitial] = React.useState<FormState | null>(null);
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const mut = useBlocoMutations(setBlocos, semanaIso);

  // Google Agenda (Fase C)
  const [googleConnected, setGoogleConnected] = React.useState<boolean | null>(null);
  const [googleEvents, setGoogleEvents] = React.useState<GoogleOverlay[]>([]);
  const [showGoogle, setShowGoogle] = React.useState(true);
  const [googleBusy, setGoogleBusy] = React.useState(false);

  React.useEffect(() => {
    if (view !== 'calendario') return;
    const [y, mo, d] = mondayISO.split('-').map(Number);
    const from = new Date(y, mo - 1, d).toISOString();
    const to = new Date(y, mo - 1, d + 7).toISOString();
    let cancel = false;
    fetch(`/api/google/calendar?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : { connected: false, events: [] }))
      .then((data: { connected: boolean; events: GoogleOverlay[] }) => {
        if (cancel) return;
        setGoogleConnected(Boolean(data.connected));
        setGoogleEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancel) setGoogleConnected(false);
      });
    return () => {
      cancel = true;
    };
  }, [view, mondayISO]);

  function conectarGoogle() {
    signIn('google-calendar', { callbackUrl: `/semana/${semanaIso}` });
  }

  async function desconectarGoogle() {
    if (!window.confirm('Desconectar o Google Agenda? Os eventos deixam de aparecer.')) return;
    setGoogleBusy(true);
    await fetch('/api/google/calendar', { method: 'DELETE' });
    setGoogleBusy(false);
    setGoogleConnected(false);
    setGoogleEvents([]);
  }

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
      {/* Linha única: Lista | Calendário | Semana | Dia | Mês | Google Agenda */}
      <div className="flex flex-wrap items-center gap-2">
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

        {view === 'calendario' && (
          <>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-sm font-semibold">
              {([
                ['week', 'Semana'],
                ['day', 'Dia'],
                ['month', 'Mês'],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalView(v)}
                  className={cn(
                    'rounded-md px-3 py-1.5 transition-colors',
                    calView === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Google Agenda */}
            {googleConnected === false && (
              <button
                type="button"
                onClick={conectarGoogle}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Link2 className="h-4 w-4" />
                Conectar Google Agenda
              </button>
            )}
            {googleConnected === true && (
              <div className="inline-flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setShowGoogle((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold transition-colors',
                    showGoogle
                      ? 'border-border text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {showGoogle ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Google Agenda
                  {googleEvents.length > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {googleEvents.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={desconectarGoogle}
                  disabled={googleBusy}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  {googleBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                  desconectar
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {view === 'lista' ? (
        <BlocosManager semanaIso={semanaIso} blocos={blocos} setBlocos={setBlocos} frentes={frentes} />
      ) : (
        <BlocosCalendario
          blocos={blocos}
          setBlocos={setBlocos}
          frentes={frentes}
          mondayISO={mondayISO}
          view={calView}
          onSelectBloco={setSelectedId}
          onCreateSlot={abrirCriacao}
          googleEvents={showGoogle ? googleEvents : []}
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
