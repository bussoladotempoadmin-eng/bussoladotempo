'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, LayoutGrid, ClipboardCheck, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { diaSemanaLabel, categoriaLabel, type DiaSemana, type Categoria } from '@/lib/schemas/compromisso';

export type PainelFrente = { id: string; nome: string; icone: string; cor: string };
export type PainelBloco = {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: Categoria;
};

const JS_TO_DIA: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function PainelDia({
  nome,
  semanaIso,
  prioridades,
  blocos,
  frentes,
}: {
  nome: string;
  semanaIso: string;
  prioridades: string[];
  blocos: PainelBloco[];
  frentes: PainelFrente[];
}) {
  // Relógio do dispositivo — atualiza a cada minuto pro indicador "agora".
  const [agora, setAgora] = React.useState<{ dia: DiaSemana; min: number } | null>(null);

  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      setAgora({ dia: JS_TO_DIA[d.getDay()], min: d.getHours() * 60 + d.getMinutes() });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  // Evita mismatch de hidratação: só filtra o dia depois que `agora` é definido no cliente.
  const diaHoje = agora?.dia;
  const blocosHoje = React.useMemo(
    () =>
      diaHoje
        ? blocos
            .filter((b) => b.diaSemana === diaHoje)
            .sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio))
        : [],
    [blocos, diaHoje],
  );

  const saudacao = !agora
    ? 'Olá'
    : agora.min < 12 * 60
      ? 'Bom dia'
      : agora.min < 18 * 60
        ? 'Boa tarde'
        : 'Boa noite';

  return (
    <section className="container max-w-3xl py-8">
      <p className="text-sm text-muted-foreground">
        {saudacao}{nome ? `, ${nome.split(' ')[0]}` : ''} 👋
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight">
        {diaHoje ? diaSemanaLabel[diaHoje] : 'Seu dia'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Semana {semanaIso}</p>

      {/* Prioridades da semana */}
      {prioridades.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prioridades da semana
          </h2>
          <ol className="space-y-2">
            {prioridades.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Blocos do dia */}
      <div className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Blocos de hoje
        </h2>
        {!agora ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : blocosHoje.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum bloco planejado pra hoje.</p>
            <Link
              href={`/semana/${semanaIso}`}
              className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Planejar a semana
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {blocosHoje.map((b) => {
              const f = frenteById.get(b.frenteId);
              const ativo = agora.min >= toMin(b.horaInicio) && agora.min < toMin(b.horaFim);
              const passou = agora.min >= toMin(b.horaFim);
              return (
                <li
                  key={b.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
                    ativo ? 'border-primary ring-1 ring-primary' : 'border-border',
                    passou && !ativo && 'opacity-50',
                  )}
                  style={{ borderLeft: `4px solid ${f?.cor ?? '#999'}` }}
                >
                  <span className="inline-flex flex-col items-center font-mono text-xs">
                    <span className="font-semibold">{b.horaInicio}</span>
                    <span className="text-muted-foreground">{b.horaFim}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.tarefa}</p>
                    <p className="text-xs text-muted-foreground">
                      {f ? `${f.icone} ${f.nome}` : ''} · {categoriaLabel[b.categoriaPlanejada]}
                    </p>
                  </div>
                  {ativo && (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      agora
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href={`/semana/${semanaIso}`} icon={<CalendarDays className="h-5 w-5" />} label="Semana" />
        <QuickAction href={`/espelho/${semanaIso}`} icon={<LayoutGrid className="h-5 w-5" />} label="Espelho" />
        <QuickAction href={`/revisao/${semanaIso}`} icon={<ClipboardCheck className="h-5 w-5" />} label="Revisão" />
        <QuickAction href="/frentes" icon={<Compass className="h-5 w-5" />} label="Frentes" />
      </div>
    </section>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
    >
      {icon}
      {label}
    </Link>
  );
}
