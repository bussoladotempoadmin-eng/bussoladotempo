'use client';

import * as React from 'react';
import { Calendar, dateFnsLocalizer, type Event as RbcEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { AcaoListItem } from '@/lib/comercial';
import { AcaoModal } from './acao-modal';
import { UnidadesFilter } from '../unidades-filter';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Paleta estável de cores por unidade (índice na lista de unidades).
const PALETA = ['#3b82f6', '#f97316', '#a855f7', '#22c55e', '#ef4444', '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#8b5cf6'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

type Opt = { id: string; nome: string };
type AcaoEvent = RbcEvent & { id: string; unidadeId: string };

export function AcoesCalendario({
  unidades,
  tipos,
  objetivos,
  podeGerenciar = false,
}: {
  unidades: Opt[];
  tipos: Opt[];
  objetivos: readonly string[];
  podeGerenciar?: boolean;
}) {
  const [aberta, setAberta] = React.useState<AcaoListItem | null>(null);
  const corPorUnidade = React.useMemo(() => {
    const m = new Map<string, string>();
    unidades.forEach((u, i) => m.set(u.id, PALETA[i % PALETA.length]));
    return m;
  }, [unidades]);

  const [monthDate, setMonthDate] = React.useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [acoes, setAcoes] = React.useState<AcaoListItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  // Unidades filtradas (vazio = todas).
  const [selecionadas, setSelecionadas] = React.useState<string[]>([]);

  // Grade do mês (segunda antes do dia 1 → domingo depois do fim).
  const grade = React.useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return {
      from: startOfWeek(first, { weekStartsOn: 1 }),
      to: endOfWeek(last, { weekStartsOn: 1 }),
    };
  }, [monthDate]);

  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/comercial/acoes?de=${ymd(grade.from)}&ate=${ymd(grade.to)}`)
      .then((r) => (r.ok ? r.json() : { acoes: [] }))
      .then((d: { acoes?: AcaoListItem[] }) => {
        if (!cancel) setAcoes(d.acoes ?? []);
      })
      .catch(() => {
        if (!cancel) setAcoes([]);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [grade, reload]);

  const events: AcaoEvent[] = React.useMemo(() => {
    const sel = new Set(selecionadas);
    return acoes
      .filter((a) => sel.size === 0 || sel.has(a.unidadeId))
      .map((a) => {
        const start = parseYmd(a.dataInicio);
        const end = parseYmd(a.dataFim);
        end.setDate(end.getDate() + 1); // fim exclusivo no calendário (evento all-day)
        return {
          id: a.id,
          unidadeId: a.unidadeId,
          title: `${a.tipo} · ${a.local}`,
          start,
          end,
          allDay: true,
        };
      });
  }, [acoes, selecionadas]);

  // Legenda: só as unidades que aparecem no calendário (já filtradas).
  const legenda = React.useMemo(() => {
    const ids = new Set(events.map((e) => e.unidadeId));
    return unidades.filter((u) => ids.has(u.id));
  }, [events, unidades]);

  const rotuloMes = format(monthDate, 'MMMM yyyy', { locale: ptBR });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[9rem] text-center text-base font-bold capitalize">{rotuloMes}</span>
        <button
          type="button"
          onClick={() => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const n = new Date();
            setMonthDate(new Date(n.getFullYear(), n.getMonth(), 1));
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
        >
          Hoje
        </button>
        {loading && <span className="text-xs text-muted-foreground">carregando…</span>}
        {unidades.length > 1 && (
          <div className="ml-auto">
            <UnidadesFilter
              unidades={unidades}
              selecionadas={selecionadas}
              onChange={setSelecionadas}
              cores={corPorUnidade}
            />
          </div>
        )}
      </div>

      {legenda.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {legenda.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: corPorUnidade.get(u.id) }} />
              {u.nome}
            </span>
          ))}
        </div>
      )}

      <div className="rbc-bussola rbc-mes rounded-2xl bg-muted/50 p-1.5 sm:p-2.5" style={{ height: '72vh', minHeight: 540 }}>
        <Calendar<AcaoEvent>
          localizer={localizer}
          culture="pt-BR"
          events={events}
          date={monthDate}
          view="month"
          views={['month']}
          toolbar={false}
          onNavigate={() => {}}
          popup
          onSelectEvent={(event) => {
            const a = acoes.find((x) => x.id === event.id);
            if (a) setAberta(a);
          }}
          dayPropGetter={(date) => {
            const d = date.getDay();
            return d === 0 || d === 6 ? { className: 'rbc-fds' } : {};
          }}
          eventPropGetter={(event) => ({
            style: { '--ev': corPorUnidade.get(event.unidadeId) ?? '#3b82f6' } as React.CSSProperties,
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
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        Toque numa ação pra abrir o detalhe. As cores representam as unidades.
      </p>

      {aberta && (
        <AcaoModal
          acao={aberta}
          unidades={unidades}
          tipos={tipos}
          objetivos={objetivos}
          podeGerenciar={podeGerenciar}
          onClose={() => {
            setAberta(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
