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

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<BlocoEvent>(Calendar);

const OFFSET: Record<DiaSemana, number> = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5, DOM: 6 };
const JS_TO_DIA: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

type BlocoEvent = RbcEvent & { id: string; bloco: BlocoDTO };

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function BlocosCalendario({
  blocos,
  setBlocos,
  frentes,
  mondayISO,
}: {
  blocos: BlocoDTO[];
  setBlocos: React.Dispatch<React.SetStateAction<BlocoDTO[]>>;
  frentes: FrenteOption[];
  mondayISO: string;
}) {
  const monday = React.useMemo(() => {
    const [y, mo, d] = mondayISO.split('-').map(Number);
    return new Date(y, mo - 1, d);
  }, [mondayISO]);

  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  const events: BlocoEvent[] = React.useMemo(() => {
    return blocos.map((b) => {
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
  }, [blocos, monday, frenteById]);

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
    <div className="rbc-bussola" style={{ height: '70vh', minHeight: 520 }}>
      <DnDCalendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        date={monday}
        view="week"
        views={['week']}
        toolbar={false}
        onNavigate={() => {}}
        onView={() => {}}
        step={30}
        timeslots={2}
        min={new Date(1970, 0, 1, 5, 0)}
        max={new Date(1970, 0, 1, 23, 30)}
        draggableAccessor={() => true}
        resizable
        onEventDrop={({ event, start, end }) => persistir(event.bloco, start as Date, end as Date)}
        onEventResize={({ event, start, end }) => persistir(event.bloco, start as Date, end as Date)}
        eventPropGetter={(event) => {
          const cor = frenteById.get(event.bloco.frenteId)?.cor ?? '#3b82f6';
          return { style: { backgroundColor: cor, borderColor: cor } };
        }}
        messages={{ week: 'Semana', day: 'Dia', today: 'Hoje', previous: 'Anterior', next: 'Próxima' }}
      />
    </div>
  );
}
