'use client';

import * as React from 'react';
import { Calendar, dateFnsLocalizer, type Event as RbcEvent } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import type { BlocoDTO, FrenteOption } from './blocos-manager';
import type { DiaSemana } from '@/lib/schemas/compromisso';
import { MesOverview } from './mes-overview';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<CalEvent>(Calendar);

const OFFSET: Record<DiaSemana, number> = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5, DOM: 6 };
const JS_TO_DIA: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

export type GoogleOverlay = { id: string; title: string; start: string; end: string; allDay: boolean };
type CalEvent = RbcEvent & { id: string; bloco?: BlocoDTO; google?: boolean };

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function BlocosCalendario({
  blocos,
  setBlocos,
  frentes,
  mondayISO,
  view,
  onSelectBloco,
  onCreateSlot,
  googleEvents,
  showGoogle = false,
}: {
  blocos: BlocoDTO[];
  setBlocos: React.Dispatch<React.SetStateAction<BlocoDTO[]>>;
  frentes: FrenteOption[];
  mondayISO: string;
  view: 'week' | 'day' | 'month';
  onSelectBloco: (id: string) => void;
  onCreateSlot: (slot: { diaSemana: DiaSemana; horaInicio: string; horaFim: string }) => void;
  googleEvents?: GoogleOverlay[];
  showGoogle?: boolean;
}) {
  const monday = React.useMemo(() => {
    const [y, mo, d] = mondayISO.split('-').map(Number);
    return new Date(y, mo - 1, d);
  }, [mondayISO]);

  const dias = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, o) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + o);
        return d;
      }),
    [monday],
  );

  const [dayDate, setDayDate] = React.useState<Date>(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dentro = dias.some((d) => d.getTime() === hoje.getTime());
    return dentro ? hoje : dias[0];
  });

  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  const nomesDia = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const events: CalEvent[] = React.useMemo(() => {
    const dosBlocos: CalEvent[] = blocos.map((b) => {
      const [hi, mi] = b.horaInicio.split(':').map(Number);
      const [hf, mf] = b.horaFim.split(':').map(Number);
      const start = new Date(monday);
      start.setDate(monday.getDate() + OFFSET[b.diaSemana]);
      start.setHours(hi, mi, 0, 0);
      const end = new Date(start);
      end.setHours(hf, mf, 0, 0);
      const f = frenteById.get(b.frenteId);
      return { id: b.id, title: `${f ? f.icone + ' ' : ''}${b.tarefa}`, start, end, bloco: b };
    });

    const doGoogle: CalEvent[] = (googleEvents ?? []).map((g) => ({
      id: `g_${g.id}`,
      title: g.title,
      start: new Date(g.start),
      end: new Date(g.end),
      allDay: g.allDay,
      google: true,
    }));

    return [...dosBlocos, ...doGoogle];
  }, [blocos, monday, frenteById, googleEvents]);

  async function persistir(b: BlocoDTO, start: Date, end: Date) {
    const diaSemana = JS_TO_DIA[start.getDay()];
    const horaInicio = hhmm(start);
    const horaFim = hhmm(end);
    if (horaFim <= horaInicio) return; // ignora redimensionamento inválido

    // otimista
    setBlocos((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, diaSemana, horaInicio, horaFim } : x)),
    );
    const res = await fetch(`/api/blocos/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diaSemana,
        horaInicio,
        horaFim,
        tarefa: b.tarefa,
        frenteId: b.frenteId,
        categoriaPlanejada: b.categoriaPlanejada,
        categoriaRealizada: b.categoriaRealizada,
      }),
    });
    if (!res.ok) {
      // reverte
      setBlocos((prev) =>
        prev.map((x) =>
          x.id === b.id
            ? { ...x, diaSemana: b.diaSemana, horaInicio: b.horaInicio, horaFim: b.horaFim }
            : x,
        ),
      );
    }
  }

  return (
    <div>
      {view === 'day' && (
        <div className="mb-3 inline-flex flex-wrap gap-1">
          {dias.map((d, i) => {
            const ativo = d.getTime() === dayDate.getTime();
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDayDate(d)}
                className={
                  ativo
                    ? 'rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground'
                    : 'rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground'
                }
              >
                {nomesDia[i]} {String(d.getDate()).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      )}

      {view === 'month' ? (
        <MesOverview frentes={frentes} mondayISO={mondayISO} showGoogle={showGoogle} />
      ) : (
      <div className="rbc-bussola" style={{ height: '70vh', minHeight: 520 }}>
        <DnDCalendar
          localizer={localizer}
          culture="pt-BR"
          events={events}
          date={view === 'week' ? monday : dayDate}
          view={view}
          views={['week', 'day']}
          toolbar={false}
          onNavigate={() => {}}
          onView={() => {}}
        step={30}
        timeslots={2}
        min={new Date(1970, 0, 1, 5, 0)}
        max={new Date(1970, 0, 1, 23, 30)}
        draggableAccessor={(event) => !event.google}
        resizable
        selectable
        onSelectSlot={({ start, end }) => {
          const s = start as Date;
          let e = end as Date;
          if (e.getTime() <= s.getTime()) e = new Date(s.getTime() + 60 * 60 * 1000);
          onCreateSlot({ diaSemana: JS_TO_DIA[s.getDay()], horaInicio: hhmm(s), horaFim: hhmm(e) });
        }}
        onSelectEvent={(event) => {
          if (event.bloco) onSelectBloco(event.bloco.id);
        }}
        onEventDrop={({ event, start, end }) =>
          event.bloco && persistir(event.bloco, start as Date, end as Date)
        }
        onEventResize={({ event, start, end }) =>
          event.bloco && persistir(event.bloco, start as Date, end as Date)
        }
        eventPropGetter={(event) => {
          if (event.google) {
            // Evento do Google = só leitura, visual discreto (listrado/cinza).
            return {
              style: {
                backgroundColor: 'hsl(var(--muted))',
                border: '1px dashed hsl(var(--muted-foreground) / 0.6)',
                color: 'hsl(var(--muted-foreground))',
                opacity: 0.9,
              },
            };
          }
          const cor = frenteById.get(event.bloco!.frenteId)?.cor ?? '#3b82f6';
          return { style: { backgroundColor: cor, borderColor: cor } };
        }}
          messages={{ week: 'Semana', day: 'Dia', today: 'Hoje', previous: 'Anterior', next: 'Próxima' }}
        />
      </div>
      )}
    </div>
  );
}
