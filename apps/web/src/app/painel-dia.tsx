'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ClipboardCheck,
  Compass,
  Check,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isoWeekLabel } from '@/lib/iso-week';
import {
  diaSemanaLabel,
  categoriaLabel,
  type DiaSemana,
  type Categoria,
} from '@/lib/schemas/compromisso';
import type { BlocoDTO, FrenteOption } from './semana/[iso]/blocos-manager';
import { useBlocoMutations } from './semana/[iso]/use-bloco-mutations';
import { BlocoModal } from './semana/[iso]/bloco-modal';

export type PainelFrente = FrenteOption;
export type PainelBloco = BlocoDTO;

const JS_TO_DIA: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

const categoriaClasses: Record<Categoria, string> = {
  IMPORTANTE: 'bg-triade-importante-soft text-triade-importante',
  URGENTE: 'bg-triade-urgente-soft text-triade-urgente',
  DISPERSO: 'bg-triade-disperso-soft text-triade-disperso',
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export type PainelPrioridade = {
  ordem: number;
  tarefa: string;
  frenteIcone: string;
  frenteNome: string;
  frenteCor: string;
};

export function PainelDia({
  nome,
  semanaIso,
  prioridades,
  prioridadeBlocos,
  blocos: blocosIniciais,
  frentes,
}: {
  nome: string;
  semanaIso: string;
  prioridades: string[];
  prioridadeBlocos: PainelPrioridade[];
  blocos: BlocoDTO[];
  frentes: FrenteOption[];
}) {
  const [blocos, setBlocos] = React.useState<BlocoDTO[]>(blocosIniciais);
  const [modalId, setModalId] = React.useState<string | null>(null);
  const [agora, setAgora] = React.useState<{ dia: DiaSemana; min: number } | null>(null);
  const mut = useBlocoMutations(setBlocos, semanaIso);

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

  const modalBloco = modalId ? blocos.find((b) => b.id === modalId) : null;

  return (
    <section className="container max-w-3xl py-8">
      <p className="text-sm text-muted-foreground">
        {saudacao}
        {nome ? `, ${nome.split(' ')[0]}` : ''} 👋
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight">
        {diaHoje ? diaSemanaLabel[diaHoje] : 'Seu dia'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Semana de {isoWeekLabel(semanaIso)}</p>

      {prioridadeBlocos.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prioridades da semana
          </h2>
          <ol className="space-y-2">
            {prioridadeBlocos.map((p) => (
              <li
                key={p.ordem}
                className="flex items-center gap-3 rounded-xl border border-amber-400/50 bg-card p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
                  {p.ordem}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.tarefa}</span>
                  {p.frenteNome && (
                    <span className="text-xs" style={{ color: p.frenteCor }}>
                      {p.frenteIcone} {p.frenteNome}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : prioridades.length > 0 ? (
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
      ) : null}

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
              const desviou = b.categoriaRealizada !== b.categoriaPlanejada;
              const tarefasTotal = b.subtarefas.length;
              const tarefasFeitas = b.subtarefas.filter((t) => t.feito).length;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setModalId(b.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40',
                      ativo ? 'border-primary ring-1 ring-primary' : 'border-border',
                      passou && !ativo && 'opacity-60',
                    )}
                    style={{ borderLeft: `4px solid ${f?.cor ?? '#999'}` }}
                  >
                    <span className="inline-flex flex-col items-center font-mono text-xs">
                      <span className="font-semibold">{b.horaInicio}</span>
                      <span className="text-muted-foreground">{b.horaFim}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{b.tarefa}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{f ? `${f.icone} ${f.nome}` : ''}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-semibold',
                            categoriaClasses[b.categoriaPlanejada],
                          )}
                        >
                          {categoriaLabel[b.categoriaPlanejada]}
                        </span>
                        {desviou && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 font-semibold',
                              categoriaClasses[b.categoriaRealizada],
                            )}
                          >
                            → {categoriaLabel[b.categoriaRealizada]}
                          </span>
                        )}
                        {b.concluido && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> concluído
                          </span>
                        )}
                        {tarefasTotal > 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold',
                              tarefasFeitas === tarefasTotal
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <ListChecks className="h-3 w-3" />
                            {tarefasFeitas}/{tarefasTotal}
                          </span>
                        )}
                      </p>
                    </div>
                    {ativo && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        agora
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <QuickAction href={`/semana/${semanaIso}`} icon={<CalendarDays className="h-5 w-5" />} label="Semana" />
        <QuickAction href={`/revisao/${semanaIso}`} icon={<ClipboardCheck className="h-5 w-5" />} label="Revisão" />
        <QuickAction href="/frentes" icon={<Compass className="h-5 w-5" />} label="Frentes" />
      </div>

      {/* Modal completo (igual ao da Semana): editar + concluir + checklist */}
      {modalBloco && (
        <BlocoModal
          bloco={modalBloco}
          frente={frenteById.get(modalBloco.frenteId)}
          frentes={frentes}
          mut={mut}
          onClose={() => setModalId(null)}
        />
      )}
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
