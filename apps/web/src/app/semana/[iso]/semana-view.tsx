'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  UploadCloud,
} from 'lucide-react';
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

/** Modo da tela, espelhado na URL (?v=) pra navegação manter o seletor. */
export type ModoSemana = 'lista' | 'semana' | 'dia' | 'mes';
const CAL_DO_MODO = { semana: 'week', dia: 'day', mes: 'month' } as const;
const MODO_DO_CAL = { week: 'semana', day: 'dia', month: 'mes' } as const;

/** Mês inicial da visão Mês: o de hoje se hoje cai nesta semana; senão, o da segunda. */
function mesInicial(mondayISO: string): Date {
  const [y, mo, d] = mondayISO.split('-').map(Number);
  const seg = new Date(y, mo - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = (hoje.getTime() - seg.getTime()) / 86400000;
  const ref = dias >= 0 && dias < 7 ? hoje : seg;
  return new Date(ref.getFullYear(), ref.getMonth(), 1);
}

const NAV_BTN =
  'inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted';

export function SemanaView({
  semanaIso,
  initialBlocos,
  frentes,
  mondayISO,
  modoInicial = 'lista',
  semanaLabel,
  semanaRange,
  anteriorIso,
  proximaIso,
}: {
  semanaIso: string;
  initialBlocos: BlocoDTO[];
  frentes: FrenteOption[];
  mondayISO: string;
  modoInicial?: ModoSemana;
  semanaLabel: string;
  semanaRange: string;
  anteriorIso: string;
  proximaIso: string;
}) {
  const [blocos, setBlocos] = React.useState<BlocoDTO[]>(initialBlocos);
  const [view, setView] = React.useState<'lista' | 'calendario'>(modoInicial === 'lista' ? 'lista' : 'calendario');
  const [calView, setCalView] = React.useState<'week' | 'day' | 'month'>(
    modoInicial === 'lista' ? 'week' : CAL_DO_MODO[modoInicial],
  );
  const [monthDate, setMonthDate] = React.useState<Date>(() => mesInicial(mondayISO));
  const modo: ModoSemana = view === 'lista' ? 'lista' : MODO_DO_CAL[calView];

  // Mantém a URL em sincronia com o seletor (sem recarregar a página).
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (modo === 'lista') url.searchParams.delete('v');
    else url.searchParams.set('v', modo);
    window.history.replaceState(null, '', url.toString());
  }, [modo]);
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
  const [syncBusy, setSyncBusy] = React.useState(false);
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);

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

  async function sincronizarGoogle() {
    setSyncBusy(true);
    setSyncMsg(null);
    const res = await fetch('/api/google/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semanaIso }),
    });
    setSyncBusy(false);
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setSyncMsg(d?.error ?? 'Não consegui sincronizar.');
      return;
    }
    const partes: string[] = [];
    if (d.enviados) partes.push(`${d.enviados} enviado${d.enviados > 1 ? 's' : ''}`);
    if (d.atualizados) partes.push(`${d.atualizados} atualizado${d.atualizados > 1 ? 's' : ''}`);
    if (d.removidos) partes.push(`${d.removidos} removido${d.removidos > 1 ? 's' : ''}`);
    setSyncMsg(partes.length ? `✓ ${partes.join(', ')} no Google` : '✓ Já estava tudo sincronizado');
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

  const naVisaoMes = modo === 'mes';
  const hoje = new Date();
  const mesEhAtual = monthDate.getFullYear() === hoje.getFullYear() && monthDate.getMonth() === hoje.getMonth();
  const qs = modo === 'lista' ? '' : `?v=${modo}`;

  const segBase = 'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors';
  const segOn = 'bg-primary text-primary-foreground';
  const segOff = 'text-muted-foreground hover:text-foreground';
  const btnGoogle =
    'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition-colors';

  return (
    <div className="space-y-4">
      {/* Cabeçalho segue o seletor: no Mês mostra o mês e as setas mudam de mês. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={cn('text-2xl font-extrabold tracking-tight sm:text-3xl', naVisaoMes && 'capitalize')}>
            {naVisaoMes ? format(monthDate, 'MMMM yyyy', { locale: ptBR }) : semanaLabel}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {naVisaoMes ? 'Visão do mês · toque num dia pra abrir a semana' : semanaRange}
          </p>
        </div>
        {naVisaoMes ? (
          <div className="flex items-center gap-1">
            {!mesEhAtual && (
              <button
                type="button"
                onClick={() => setMonthDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}
                className={NAV_BTN}
              >
                Hoje
              </button>
            )}
            <button
              type="button"
              onClick={() => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className={NAV_BTN}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className={NAV_BTN}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link href={`/semana/${anteriorIso}${qs}`} className={NAV_BTN}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <Link href={`/semana/${proximaIso}${qs}`} className={NAV_BTN}>
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Linha de controles: Lista | Calendário · Dia | Semana | Mês · Google Agenda */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setView('lista')}
                className={cn(segBase, view === 'lista' ? segOn : segOff)}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView('calendario')}
                className={cn(segBase, view === 'calendario' ? segOn : segOff)}
              >
                <CalendarDays className="h-4 w-4" />
                Calendário
              </button>
            </div>
          </div>

          {view === 'calendario' && (
            <div>
              <div className="inline-flex rounded-lg border border-border p-0.5 text-sm font-semibold">
                {([
                  ['day', 'Dia'],
                  ['week', 'Semana'],
                  ['month', 'Mês'],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCalView(v)}
                    className={cn(segBase, calView === v ? segOn : segOff)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'calendario' && googleConnected !== null && (
            <div className="flex flex-wrap items-center gap-2">
              {googleConnected === false ? (
                <button
                  type="button"
                  onClick={conectarGoogle}
                  className={cn(btnGoogle, 'text-muted-foreground hover:text-foreground')}
                >
                  <Link2 className="h-4 w-4" />
                  Conectar Google Agenda
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowGoogle((v) => !v)}
                    title={showGoogle ? 'Esconder eventos do Google' : 'Mostrar eventos do Google'}
                    className={cn(btnGoogle, showGoogle ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
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
                    onClick={sincronizarGoogle}
                    disabled={syncBusy}
                    title="Enviar os blocos desta semana pro seu Google Agenda"
                    className={cn(btnGoogle, 'text-muted-foreground hover:text-foreground disabled:opacity-50')}
                  >
                    {syncBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Enviar pro Google
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
                </>
              )}
            </div>
          )}

          {syncMsg && <span className="w-full text-xs text-muted-foreground">{syncMsg}</span>}
        </div>

        <div>
          {view === 'lista' ? (
            <BlocosManager
              semanaIso={semanaIso}
              blocos={blocos}
              setBlocos={setBlocos}
              frentes={frentes}
              onSelectBloco={setSelectedId}
            />
          ) : (
            <BlocosCalendario
              blocos={blocos}
              setBlocos={setBlocos}
              frentes={frentes}
              mondayISO={mondayISO}
              view={calView}
              monthDate={monthDate}
              onSelectBloco={setSelectedId}
              onCreateSlot={abrirCriacao}
              googleEvents={showGoogle ? googleEvents : []}
              showGoogle={googleConnected === true && showGoogle}
            />
          )}
        </div>
      </div>

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
