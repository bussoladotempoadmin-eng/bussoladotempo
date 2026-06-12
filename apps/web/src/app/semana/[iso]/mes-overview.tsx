'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, dateFnsLocalizer, type Event as RbcEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

type MesEvent = RbcEvent & { id: string; navIso: string; google?: boolean };

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MesOverview({
  frentes,
  mondayISO,
  showGoogle = false,
}: {
  frentes: FrenteOption[];
  mondayISO: string;
  showGoogle?: boolean;
}) {
  const router = useRouter();
  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  // Mês visível = mês que contém a segunda-feira da semana atual.
  const [monthDate, setMonthDate] = React.useState<Date>(() => {
    const [y, mo] = mondayISO.split('-').map(Number);
    return new Date(y, mo - 1, 1);
  });

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
      };
    });

    return [...dosBlocos, ...doGoogle];
  }, [blocos, googleEvents, frenteById]);

  function irParaData(d: Date) {
    router.push(`/semana/${isoWeek(d)}`);
  }

  const rotuloMes = format(monthDate, 'MMMM yyyy', { locale: ptBR });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[10rem] text-center text-sm font-bold capitalize">{rotuloMes}</span>
        <button
          type="button"
          onClick={() => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {loading && <span className="text-xs text-muted-foreground">carregando…</span>}
      </div>

      <p className="mb-2 text-xs text-muted-foreground">
        Toque num dia ou compromisso pra abrir aquela semana e editar.
      </p>

      <div className="rbc-bussola" style={{ height: '70vh', minHeight: 520 }}>
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
          onSelectEvent={(event) => router.push(`/semana/${event.navIso}`)}
          onSelectSlot={({ start }) => irParaData(start as Date)}
          onDrillDown={(date) => irParaData(date)}
          eventPropGetter={(event) => {
            if (event.google) {
              return {
                style: {
                  backgroundColor: 'hsl(var(--muted))',
                  border: '1px dashed hsl(var(--muted-foreground) / 0.6)',
                  color: 'hsl(var(--muted-foreground))',
                  opacity: 0.9,
                },
              };
            }
            const b = blocos.find((x) => x.id === event.id);
            const cor = (b && frenteById.get(b.frenteId)?.cor) ?? '#3b82f6';
            return { style: { backgroundColor: cor, borderColor: cor } };
          }}
          messages={{ month: 'Mês', today: 'Hoje', previous: 'Anterior', next: 'Próximo' }}
        />
      </div>
    </div>
  );
}
