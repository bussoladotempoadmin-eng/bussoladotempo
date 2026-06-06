'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Plus, Check, X, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  diaSemanaValues,
  diaSemanaLabel,
  categoriaValues,
  categoriaLabel,
  type DiaSemana,
  type Categoria,
} from '@/lib/schemas/compromisso';
import { blocoUpdateSchema } from '@/lib/schemas/bloco';

export type FrenteOption = { id: string; nome: string; icone: string; cor: string };

export type BlocoDTO = {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
  prioridadeSemana: number | null;
};

type FormState = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
};

const categoriaClasses: Record<Categoria, string> = {
  IMPORTANTE: 'bg-triade-importante-soft text-triade-importante',
  URGENTE: 'bg-triade-urgente-soft text-triade-urgente',
  DISPERSO: 'bg-triade-disperso-soft text-triade-disperso',
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dur(b: { horaInicio: string; horaFim: string }): number {
  return (toMin(b.horaFim) - toMin(b.horaInicio)) / 60;
}

export function BlocosManager({
  semanaIso,
  initialBlocos,
  frentes,
}: {
  semanaIso: string;
  initialBlocos: BlocoDTO[];
  frentes: FrenteOption[];
}) {
  const [blocos, setBlocos] = React.useState<BlocoDTO[]>(initialBlocos);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const frenteById = React.useMemo(
    () => new Map(frentes.map((f) => [f.id, f])),
    [frentes],
  );

  const emptyForm: FormState = React.useMemo(
    () => ({
      diaSemana: 'SEG',
      horaInicio: '08:00',
      horaFim: '12:00',
      tarefa: '',
      frenteId: frentes[0]?.id ?? '',
      categoriaPlanejada: 'IMPORTANTE',
      categoriaRealizada: 'IMPORTANTE',
    }),
    [frentes],
  );

  const totalHoras = blocos.reduce((s, b) => s + dur(b), 0);

  function validate(form: FormState) {
    const parsed = blocoUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return null;
    }
    return parsed.data;
  }

  async function handleCreate(form: FormState) {
    setError(null);
    const data = validate(form);
    if (!data) return;
    setBusy(true);
    const res = await fetch('/api/blocos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, semanaIso }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? 'Não consegui criar o bloco.');
      return;
    }
    const novo: BlocoDTO = await res.json();
    setBlocos((prev) => [...prev, novo]);
    setAdding(false);
  }

  async function handleUpdate(id: string, form: FormState) {
    setError(null);
    const data = validate(form);
    if (!data) return;
    setBusy(true);
    const res = await fetch(`/api/blocos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? 'Não consegui salvar o bloco.');
      return;
    }
    const atualizado: BlocoDTO = await res.json();
    setBlocos((prev) => prev.map((b) => (b.id === id ? atualizado : b)));
    setEditingId(null);
  }

  async function handleDelete(b: BlocoDTO) {
    if (!window.confirm(`Excluir o bloco "${b.tarefa}"?`)) return;
    setError(null);
    const res = await fetch(`/api/blocos/${b.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Não consegui excluir o bloco.');
      return;
    }
    setBlocos((prev) => prev.filter((x) => x.id !== b.id));
  }

  async function handleTogglePrioridade(b: BlocoDTO) {
    setError(null);
    const marcar = !b.prioridadeSemana;
    const res = await fetch(`/api/blocos/${b.id}/prioridade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marcar }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? 'Não consegui mudar a prioridade.');
      return;
    }
    const atualizado: BlocoDTO = await res.json();
    setBlocos((prev) => prev.map((x) => (x.id === b.id ? atualizado : x)));
  }

  if (frentes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Você precisa de pelo menos uma frente pra criar blocos.
        </p>
        <Link
          href="/frentes"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Criar frentes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {diaSemanaValues.map((dia) => {
          const doDia = blocos.filter((b) => b.diaSemana === dia);
          if (doDia.length === 0) return null;
          const horasDia = doDia.reduce((s, b) => s + dur(b), 0);
          return (
            <div key={dia}>
              <h2 className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>{diaSemanaLabel[dia]}</span>
                <span className="font-mono normal-case">{horasDia.toLocaleString('pt-BR')}h</span>
              </h2>
              <ul className="space-y-2">
                {doDia.map((b) =>
                  editingId === b.id ? (
                    <li key={b.id}>
                      <BlocoForm
                        initial={toForm(b)}
                        frentes={frentes}
                        busy={busy}
                        onSubmit={(form) => handleUpdate(b.id, form)}
                        onCancel={() => {
                          setEditingId(null);
                          setError(null);
                        }}
                      />
                    </li>
                  ) : (
                    <BlocoRow
                      key={b.id}
                      bloco={b}
                      frente={frenteById.get(b.frenteId)}
                      onEdit={() => {
                        setEditingId(b.id);
                        setAdding(false);
                        setError(null);
                      }}
                      onDelete={() => handleDelete(b)}
                      onTogglePrioridade={() => handleTogglePrioridade(b)}
                    />
                  ),
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {blocos.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhum bloco nesta semana ainda. Adicione o primeiro.
        </p>
      )}

      {adding ? (
        <BlocoForm
          initial={emptyForm}
          frentes={frentes}
          busy={busy}
          onSubmit={handleCreate}
          onCancel={() => {
            setAdding(false);
            setError(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
            setError(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Novo bloco
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="text-muted-foreground">
          {blocos.length} {blocos.length === 1 ? 'bloco' : 'blocos'}
        </span>
        <span className="font-semibold">{totalHoras.toLocaleString('pt-BR')}h planejadas</span>
      </div>
    </div>
  );
}

function toForm(b: BlocoDTO): FormState {
  return {
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    frenteId: b.frenteId,
    categoriaPlanejada: b.categoriaPlanejada,
    categoriaRealizada: b.categoriaRealizada,
  };
}

function BlocoRow({
  bloco: b,
  frente,
  onEdit,
  onDelete,
  onTogglePrioridade,
}: {
  bloco: BlocoDTO;
  frente?: FrenteOption;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePrioridade: () => void;
}) {
  const desviou = b.categoriaPlanejada !== b.categoriaRealizada;
  const prioridade = b.prioridadeSemana;
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm',
        prioridade ? 'border-amber-400/60 ring-1 ring-amber-400/40' : 'border-border',
      )}
      style={{ borderLeft: `4px solid ${frente?.cor ?? '#999'}` }}
    >
      <button
        type="button"
        onClick={onTogglePrioridade}
        aria-label={prioridade ? 'Tirar prioridade' : 'Marcar como prioridade'}
        title={prioridade ? `Prioridade ${prioridade}` : 'Marcar como prioridade da semana'}
        className="relative shrink-0 rounded-lg p-1.5 transition-colors hover:bg-muted"
      >
        <Star
          className={cn(
            'h-4 w-4',
            prioridade ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground',
          )}
        />
        {prioridade && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white">
            {prioridade}
          </span>
        )}
      </button>

      <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-semibold">
        <Clock className="h-3 w-3" />
        {b.horaInicio}–{b.horaFim}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{b.tarefa}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          {frente && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
              style={{ backgroundColor: `${frente.cor}22`, color: frente.cor }}
            >
              {frente.icone} {frente.nome}
            </span>
          )}
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
              title="Categoria realizada (diferente da planejada)"
            >
              → {categoriaLabel[b.categoriaRealizada]}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar"
        title="Editar"
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Excluir"
        title="Excluir"
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function BlocoForm({
  initial,
  frentes,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  frentes: FrenteOption[];
  busy: boolean;
  onSubmit: (form: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(initial);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const fieldClass = 'rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-primary/40 bg-card p-4 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Dia</span>
          <select
            value={form.diaSemana}
            onChange={(e) => set('diaSemana', e.target.value as DiaSemana)}
            className={fieldClass}
          >
            {diaSemanaValues.map((d) => (
              <option key={d} value={d}>
                {diaSemanaLabel[d]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Início</span>
          <input
            type="time"
            value={form.horaInicio}
            onChange={(e) => set('horaInicio', e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Fim</span>
          <input
            type="time"
            value={form.horaFim}
            onChange={(e) => set('horaFim', e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
          <span className="text-xs font-semibold text-muted-foreground">Tarefa</span>
          <input
            value={form.tarefa}
            onChange={(e) => set('tarefa', e.target.value)}
            placeholder="Ex: Revisar pipeline + alinhar marketing"
            autoFocus
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Frente</span>
          <select
            value={form.frenteId}
            onChange={(e) => set('frenteId', e.target.value)}
            className={fieldClass}
          >
            {frentes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.icone} {f.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Planejada</span>
          <select
            value={form.categoriaPlanejada}
            onChange={(e) => set('categoriaPlanejada', e.target.value as Categoria)}
            className={fieldClass}
          >
            {categoriaValues.map((c) => (
              <option key={c} value={c}>
                {categoriaLabel[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Realizada</span>
          <select
            value={form.categoriaRealizada}
            onChange={(e) => set('categoriaRealizada', e.target.value as Categoria)}
            className={fieldClass}
          >
            {categoriaValues.map((c) => (
              <option key={c} value={c}>
                {categoriaLabel[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          Salvar
        </button>
      </div>
    </form>
  );
}
