'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, dateFnsLocalizer, type Event as RbcEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isoWeek, isoWeekMondayYMD } from '@/lib/iso-week';
import type { FrenteOption } from './blocos-manager';
import type { GoogleOverlay } from './blocos-calendario';
import type { DiaSemana } from '@/lib/schemas/compromisso';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const OFFSET: Record<DiaSemana, number> = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5, DOM: 6 };

type RangeBloco = {
  id: string;
  semanaIso: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
};

type MesEvent = RbcEvent & { id: string; navIso: string; google?: boolean; cor: string; hora?: string };

const COR_GOOGLE = '#94a3b8';

/** "19:00" → "19h", "18:30" → "18h30" (rótulo curto, como numa agenda de papel). */
function horaCurta(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

function EventoMes({ event }: { event: MesEvent }) {
  return (
    <span className="block truncate">
      {event.hora && <b className="mr-1 font-bold">{event.hora}</b>}
      {event.title}
    </span>
  );
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MesOverview({
  frentes,
  monthDate,
  showGoogle = false,
}: {
  frentes: FrenteOption[];
  /** Mês visível (1º dia) — controlado pelo cabeçalho da página. */
  monthDate: Date;
  showGoogle?: boolean;
}) {
  const router = useRouter();
  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  const [blocos, setBlocos] = React.useState<RangeBloco[]>([]);
  const [googleEvents, setGoogleEvents] = React.useState<GoogleOverlay[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Intervalo da grade do mês (segunda antes do dia 1 → domingo depois do fim).
  const grade = React.useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    return {
      from: startOfWeek(first, { weekStartsOn: 1 }),
      to: endOfWeek(last, { weekStartsOn: 1 }),
    };
  }, [monthDate]);

  React.useEffect(() => {
    let cancelado = false;
    setLoading(true);
    fetch(`/api/blocos/range?from=${ymd(grade.from)}&to=${ymd(grade.to)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RangeBloco[]) => {
        if (!cancelado) setBlocos(data);
      })
      .catch(() => {
        if (!cancelado) setBlocos([]);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [grade]);

  React.useEffect(() => {
    if (!showGoogle) {
      setGoogleEvents([]);
      return;
    }
    let cancelado = false;
    fetch(`/api/google/calendar?from=${grade.from.toISOString()}&to=${grade.to.toISOString()}`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: GoogleOverlay[] }) => {
        if (!cancelado) setGoogleEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelado) setGoogleEvents([]);
      });
    return () => {
      cancelado = true;
    };
  }, [grade, showGoogle]);

  const events: MesEvent[] = React.useMemo(() => {
    const dosBlocos: MesEvent[] = blocos.map((b) => {
      const [y, mo, d] = isoWeekMondayYMD(b.semanaIso).split('-').map(Number);
      const start = new Date(y, mo - 1, d + OFFSET[b.diaSemana]);
      const [hi, mi] = b.horaInicio.split(':').map(Number);
      start.setHours(hi, mi, 0, 0);
      const end = new Date(start);
      const [hf, mf] = b.horaFim.split(':').map(Number);
      end.setHours(hf, mf, 0, 0);
      const f = frenteById.get(b.frenteId);
      return {
        id: b.id,
        title: `${f ? f.icone + ' ' : ''}${b.tarefa}`,
        start,
        end,
        navIso: b.semanaIso,
        cor: f?.cor ?? '#3b82f6',
        hora: horaCurta(b.horaInicio),
      };
    });

    const doGoogle: MesEvent[] = googleEvents.map((g) => {
      const start = new Date(g.start);
      return {
        id: `g_${g.id}`,
        title: g.title,
        start,
        end: new Date(g.end),
        allDay: g.allDay,
        navIso: isoWeek(start),
        google: true,
        cor: COR_GOOGLE,
        hora: g.allDay ? undefined : horaCurta(format(start, 'HH:mm')),
      };
    });

    return [...dosBlocos, ...doGoogle];
  }, [blocos, googleEvents, frenteById]);

  // Abrir uma semana a partir do mês já cai na visão Semana do calendário.
  function abrirSemana(iso: string) {
    router.push(`/semana/${iso}?v=semana`);
  }
  function irParaData(d: Date) {
    abrirSemana(isoWeek(d));
  }

  // Legenda: só as frentes que aparecem na grade deste mês.
  const legenda = React.useMemo(() => {
    const ids = new Set(blocos.map((b) => b.frenteId));
    return frentes.filter((f) => ids.has(f.id));
  }, [blocos, frentes]);
  const temGoogle = googleEvents.length > 0;

  return (
    <div>
      {(legenda.length > 0 || temGoogle || loading) && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {loading && <span className="text-xs text-muted-foreground">carregando…</span>}
          {legenda.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: f.cor }} />
              {f.nome}
            </span>
          ))}
          {temGoogle && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-dashed" style={{ borderColor: COR_GOOGLE }} />
              Google Agenda
            </span>
          )}
        </div>
      )}

      <div className="rbc-bussola rbc-mes rounded-2xl bg-muted/50 p-1.5 sm:p-2.5" style={{ height: 'calc(100vh - 265px)', minHeight: 480 }}>
        <Calendar<MesEvent>
          localizer={localizer}
          culture="pt-BR"
          events={events}
          date={monthDate}
          view="month"
          views={['month']}
          toolbar={false}
          onNavigate={() => {}}
          selectable
          popup
          components={{ event: EventoMes }}
          onSelectEvent={(event) => abrirSemana(event.navIso)}
          onSelectSlot={({ start }) => irParaData(start as Date)}
          onDrillDown={(date) => irParaData(date)}
          dayPropGetter={(date) => {
            const d = date.getDay();
            return d === 0 || d === 6 ? { className: 'rbc-fds' } : {};
          }}
          eventPropGetter={(event) => ({
            className: event.google ? 'ev-google' : undefined,
            style: { '--ev': event.cor } as React.CSSProperties,
          })}
          messages={{
            month: 'Mês',
            today: 'Hoje',
            previous: 'Anterior',
            next: 'Próximo',
            showMore: (n: number) => `+${n} mais`,
          }}
        />
      </div>

    </div>
  );
}
