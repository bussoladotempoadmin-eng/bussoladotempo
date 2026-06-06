'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  LayoutGrid,
  ClipboardCheck,
  Compass,
  Check,
  Flame,
  Wind,
  Clock3,
  X,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  diaSemanaLabel,
  categoriaLabel,
  type DiaSemana,
  type Categoria,
} from '@/lib/schemas/compromisso';

export type PainelFrente = { id: string; nome: string; icone: string; cor: string };
export type PainelBloco = {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
  tarefasTotal: number;
  tarefasFeitas: number;
};

type Resultado = 'SIM' | 'URGENTE' | 'DISPERSO';

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

function realizadaDe(b: PainelBloco, r: Resultado): Categoria {
  if (r === 'SIM') return b.categoriaPlanejada;
  if (r === 'URGENTE') return 'URGENTE';
  return 'DISPERSO';
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
  blocos: PainelBloco[];
  frentes: PainelFrente[];
}) {
  const [blocos, setBlocos] = React.useState<PainelBloco[]>(blocosIniciais);
  const [modalId, setModalId] = React.useState<string | null>(null);
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

  async function registrar(id: string, resultado: Resultado) {
    setModalId(null);
    const alvo = blocos.find((b) => b.id === id);
    if (!alvo) return;
    const anterior = alvo.categoriaRealizada;
    const nova = realizadaDe(alvo, resultado);
    setBlocos((prev) => prev.map((b) => (b.id === id ? { ...b, categoriaRealizada: nova } : b)));

    const res = await fetch(`/api/blocos/${id}/realizado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultado }),
    });
    if (!res.ok) {
      // reverte em caso de erro
      setBlocos((prev) =>
        prev.map((b) => (b.id === id ? { ...b, categoriaRealizada: anterior } : b)),
      );
    }
  }

  // Auto-fechar o modal em 60s = "Fiz" (default suave da Tela 4).
  const registrarRef = React.useRef(registrar);
  registrarRef.current = registrar;
  React.useEffect(() => {
    if (!modalId) return;
    const t = setTimeout(() => registrarRef.current(modalId, 'SIM'), 60_000);
    return () => clearTimeout(t);
  }, [modalId]);

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
      <p className="mt-1 text-sm text-muted-foreground">Semana {semanaIso}</p>

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
                        {b.tarefasTotal > 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold',
                              b.tarefasFeitas === b.tarefasTotal
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <ListChecks className="h-3 w-3" />
                            {b.tarefasFeitas}/{b.tarefasTotal}
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

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href={`/semana/${semanaIso}`} icon={<CalendarDays className="h-5 w-5" />} label="Semana" />
        <QuickAction href={`/espelho/${semanaIso}`} icon={<LayoutGrid className="h-5 w-5" />} label="Espelho" />
        <QuickAction href={`/revisao/${semanaIso}`} icon={<ClipboardCheck className="h-5 w-5" />} label="Revisão" />
        <QuickAction href="/frentes" icon={<Compass className="h-5 w-5" />} label="Frentes" />
      </div>

      {/* Modal de swipe rápido */}
      {modalBloco && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setModalId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="font-bold">{modalBloco.tarefa}</p>
              <button
                type="button"
                onClick={() => setModalId(null)}
                aria-label="Fechar"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Como foi esse bloco? (sem resposta em 60s = “Fiz”)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SwipeButton
                onClick={() => registrar(modalBloco.id, 'SIM')}
                icon={<Check className="h-5 w-5" />}
                label="Fiz"
                className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
              />
              <SwipeButton
                onClick={() => registrar(modalBloco.id, 'URGENTE')}
                icon={<Flame className="h-5 w-5" />}
                label="Virou urgente"
                className="bg-triade-urgente-soft text-triade-urgente hover:opacity-80"
              />
              <SwipeButton
                onClick={() => registrar(modalBloco.id, 'DISPERSO')}
                icon={<Wind className="h-5 w-5" />}
                label="Foi disperso"
                className="bg-triade-disperso-soft text-triade-disperso hover:opacity-80"
              />
              <SwipeButton
                onClick={() => setModalId(null)}
                icon={<Clock3 className="h-5 w-5" />}
                label="Depois"
                className="bg-muted text-muted-foreground hover:opacity-80"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SwipeButton({
  onClick,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-xl p-4 text-sm font-bold transition-all',
        className,
      )}
    >
      {icon}
      {label}
    </button>
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
