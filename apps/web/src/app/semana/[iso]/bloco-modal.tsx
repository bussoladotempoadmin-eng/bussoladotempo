'use client';

import * as React from 'react';
import {
  X,
  Star,
  Trash2,
  Pencil,
  Check,
  Flame,
  Wind,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoriaLabel, type Categoria } from '@/lib/schemas/compromisso';
import { blocoUpdateSchema } from '@/lib/schemas/bloco';
import {
  BlocoForm,
  toForm,
  type BlocoDTO,
  type FrenteOption,
  type FormState,
} from './blocos-manager';
import type { useBlocoMutations } from './use-bloco-mutations';

const categoriaClasses: Record<Categoria, string> = {
  IMPORTANTE: 'bg-triade-importante-soft text-triade-importante',
  URGENTE: 'bg-triade-urgente-soft text-triade-urgente',
  DISPERSO: 'bg-triade-disperso-soft text-triade-disperso',
};

export function BlocoModal({
  bloco: b,
  frente,
  frentes,
  mut,
  onClose,
}: {
  bloco: BlocoDTO;
  frente?: FrenteOption;
  frentes: FrenteOption[];
  mut: ReturnType<typeof useBlocoMutations>;
  onClose: () => void;
}) {
  const [editando, setEditando] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [novaTarefa, setNovaTarefa] = React.useState('');
  const [novaHora, setNovaHora] = React.useState('');

  const tarefasOrdenadas = [...b.subtarefas].sort((a, c) =>
    (a.hora ?? '99:99').localeCompare(c.hora ?? '99:99'),
  );

  async function salvarEdicao(form: FormState) {
    const parsed = blocoUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setBusy(true);
    const ok = await mut.updateBloco(b.id, {
      ...parsed.data,
      categoriaRealizada: parsed.data.categoriaRealizada ?? parsed.data.categoriaPlanejada,
    });
    setBusy(false);
    if (ok) setEditando(false);
    else setError('Não consegui salvar.');
  }

  async function excluir() {
    if (!window.confirm(`Excluir o bloco "${b.tarefa}"?`)) return;
    const ok = await mut.deleteBloco(b.id);
    if (ok) onClose();
  }

  const [novaHoraFim, setNovaHoraFim] = React.useState('');
  function submitTarefa() {
    const t = novaTarefa.trim();
    if (!t) return;
    mut.addTarefa(b.id, t, novaHora || null, novaHoraFim || null);
    setNovaTarefa('');
    setNovaHora('');
    setNovaHoraFim('');
  }

  const realizadoBtns: { r: 'SIM' | 'URGENTE' | 'DISPERSO'; label: string; icon: React.ReactNode; cls: string }[] = [
    { r: 'SIM', label: 'Como planejado', icon: <Check className="h-4 w-4" />, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
    { r: 'URGENTE', label: 'Virou urgente', icon: <Flame className="h-4 w-4" />, cls: 'bg-triade-urgente-soft text-triade-urgente' },
    { r: 'DISPERSO', label: 'Foi disperso', icon: <Wind className="h-4 w-4" />, cls: 'bg-triade-disperso-soft text-triade-disperso' },
  ];

  // datetime-local: "YYYY-MM-DDTHH:mm" no fuso local.
  function paraInputLocal(d: Date): string {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  }
  const [quando, setQuando] = React.useState<string>(() =>
    paraInputLocal(b.concluidoEm ? new Date(b.concluidoEm) : new Date()),
  );
  // Horário real do bloco (Caso 2) — começa no planejado; só vira desvio se mudar.
  const [realIni, setRealIni] = React.useState(b.horaRealInicio ?? b.horaInicio);
  const [realFim, setRealFim] = React.useState(b.horaRealFim ?? b.horaFim);
  const horarioDesviou = realIni !== b.horaInicio || realFim !== b.horaFim;

  async function concluir(r: 'SIM' | 'URGENTE' | 'DISPERSO') {
    const iso = quando ? new Date(quando).toISOString() : undefined;
    await mut.registrarRealizado(b.id, r, {
      concluidoEm: iso,
      horaRealInicio: realIni,
      horaRealFim: realFim,
    });
  }

  const concluidoLabel = b.concluidoEm
    ? new Date(b.concluidoEm).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {b.horaInicio}–{b.horaFim}
            </p>
            <h2 className="text-lg font-bold leading-tight">{b.tarefa}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              {frente && (
                <span className="font-medium" style={{ color: frente.cor }}>
                  {frente.icone} {frente.nome}
                </span>
              )}
              <span className={cn('rounded-full px-2 py-0.5 font-semibold', categoriaClasses[b.categoriaPlanejada])}>
                {categoriaLabel[b.categoriaPlanejada]}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {editando ? (
          <BlocoForm
            initial={toForm(b)}
            frentes={frentes}
            busy={busy}
            onSubmit={salvarEdicao}
            onCancel={() => setEditando(false)}
          />
        ) : (
          <>
            {/* Concluir a demanda */}
            <div className="mb-4 rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {b.concluido ? 'Concluído' : 'Concluir'}
                </p>
                {b.concluido && concluidoLabel && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> em {concluidoLabel}
                  </span>
                )}
              </div>

              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0">Quando concluiu</span>
                <input
                  type="datetime-local"
                  value={quando}
                  onChange={(e) => setQuando(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>

              <p className="mb-1.5 text-xs text-muted-foreground">Como realmente foi?</p>
              <div className="grid grid-cols-3 gap-2">
                {realizadoBtns.map((rb) => {
                  const ativo =
                    b.concluido &&
                    ((rb.r === 'SIM' && b.categoriaRealizada === b.categoriaPlanejada) ||
                      (rb.r === 'URGENTE' && b.categoriaRealizada === 'URGENTE') ||
                      (rb.r === 'DISPERSO' && b.categoriaRealizada === 'DISPERSO'));
                  return (
                    <button
                      key={rb.r}
                      type="button"
                      onClick={() => concluir(rb.r)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs font-bold transition-all',
                        rb.cls,
                        ativo && 'ring-2 ring-offset-1 ring-current',
                      )}
                    >
                      {rb.icon}
                      {rb.label}
                    </button>
                  );
                })}
              </div>

              {/* Horário real do bloco (Caso 2) — só preencha se executou fora do planejado */}
              <div className="mt-3 rounded-lg bg-muted/40 p-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-semibold">Horário real</span>
                  <input
                    type="time"
                    value={realIni}
                    onChange={(e) => setRealIni(e.target.value)}
                    className="rounded-md border border-border bg-background px-1.5 py-1 font-mono text-foreground"
                  />
                  <span>–</span>
                  <input
                    type="time"
                    value={realFim}
                    onChange={(e) => setRealFim(e.target.value)}
                    className="rounded-md border border-border bg-background px-1.5 py-1 font-mono text-foreground"
                  />
                  <span className="text-[11px]">
                    (planejado {b.horaInicio}–{b.horaFim})
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {horarioDesviou
                    ? '⚠️ Executado fora do planejado — isso entra na análise da IA e do Coach.'
                    : 'Mantém o planejado. Ajuste só se você fez em outro horário.'}
                </p>
              </div>

              {b.concluido && (
                <button
                  type="button"
                  onClick={() => mut.reabrirBloco(b.id)}
                  className="mt-2.5 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                >
                  Reabrir (marcar como não concluído)
                </button>
              )}
            </div>

            {/* Checklist — cada tarefa com Início e Fim */}
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                O que fazer
              </p>
              {tarefasOrdenadas.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                  {tarefasOrdenadas.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <button type="button" onClick={() => mut.toggleTarefa(b.id, t.id, !t.feito)} className="shrink-0">
                        {t.feito ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <input
                        type="time"
                        aria-label="Início da tarefa"
                        value={t.hora ?? ''}
                        onChange={(e) => mut.updateTarefaHora(b.id, t.id, e.target.value || null)}
                        className={cn(
                          'w-[4.4rem] shrink-0 rounded-md border border-border bg-background px-1 py-0.5 font-mono text-xs',
                          !t.hora && 'text-muted-foreground',
                        )}
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        aria-label="Fim da tarefa"
                        value={t.horaFim ?? ''}
                        onChange={(e) => mut.updateTarefaFim(b.id, t.id, e.target.value || null)}
                        className={cn(
                          'w-[4.4rem] shrink-0 rounded-md border border-border bg-background px-1 py-0.5 font-mono text-xs',
                          !t.horaFim && 'text-muted-foreground',
                        )}
                      />
                      <span className={cn('flex-1 text-sm', t.feito && 'text-muted-foreground line-through')}>
                        {t.texto}
                      </span>
                      <button
                        type="button"
                        onClick={() => mut.deleteTarefa(b.id, t.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Adicionar: Início | Fim | tarefa */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    aria-label="Início"
                    value={novaHora}
                    onChange={(e) => setNovaHora(e.target.value)}
                    className="w-[4.4rem] rounded-lg border border-border bg-background px-1 py-1.5 font-mono text-xs text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <input
                    type="time"
                    aria-label="Fim"
                    value={novaHoraFim}
                    onChange={(e) => setNovaHoraFim(e.target.value)}
                    className="w-[4.4rem] rounded-lg border border-border bg-background px-1 py-1.5 font-mono text-xs text-muted-foreground"
                  />
                </div>
                <input
                  value={novaTarefa}
                  onChange={(e) => setNovaTarefa(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitTarefa();
                    }
                  }}
                  placeholder="Adicionar tarefa…"
                  className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={submitTarefa}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => mut.togglePrioridade(b.id, !b.prioridadeSemana)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                  b.prioridadeSemana
                    ? 'border-amber-400 text-amber-600'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Star className={cn('h-4 w-4', b.prioridadeSemana && 'fill-amber-400 text-amber-400')} />
                {b.prioridadeSemana ? `Prioridade ${b.prioridadeSemana}` : 'Prioridade'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={excluir}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
