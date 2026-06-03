'use client';

import * as React from 'react';
import { Pencil, Trash2, Plus, Check, X, Clock } from 'lucide-react';
import {
  compromissoSchema,
  diaSemanaValues,
  diaSemanaLabel,
  categoriaValues,
  categoriaLabel,
  type DiaSemana,
  type Categoria,
} from '@/lib/schemas/compromisso';

export type FrenteOption = { id: string; nome: string; icone: string; cor: string };

export type CompromissoDTO = {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  descricao: string;
  frenteId: string | null;
  categoria: Categoria;
};

type FormState = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  descricao: string;
  frenteId: string;
  categoria: Categoria;
};

const emptyForm: FormState = {
  diaSemana: 'SEG',
  horaInicio: '08:00',
  horaFim: '09:00',
  descricao: '',
  frenteId: '',
  categoria: 'IMPORTANTE',
};

export function CompromissosManager({
  initialCompromissos,
  frentes,
}: {
  initialCompromissos: CompromissoDTO[];
  frentes: FrenteOption[];
}) {
  const [items, setItems] = React.useState<CompromissoDTO[]>(initialCompromissos);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const frenteById = React.useMemo(
    () => new Map(frentes.map((f) => [f.id, f])),
    [frentes],
  );

  function validate(form: FormState) {
    const parsed = compromissoSchema.safeParse(form);
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
    const res = await fetch('/api/compromissos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? 'Não consegui criar o compromisso.');
      return;
    }
    const novo: CompromissoDTO = await res.json();
    setItems((prev) => [...prev, novo]);
    setAdding(false);
  }

  async function handleUpdate(id: string, form: FormState) {
    setError(null);
    const data = validate(form);
    if (!data) return;
    setBusy(true);
    const res = await fetch(`/api/compromissos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? 'Não consegui salvar o compromisso.');
      return;
    }
    const atualizado: CompromissoDTO = await res.json();
    setItems((prev) => prev.map((c) => (c.id === id ? atualizado : c)));
    setEditingId(null);
  }

  async function handleDelete(c: CompromissoDTO) {
    if (!window.confirm(`Excluir "${c.descricao}"?`)) return;
    setError(null);
    const res = await fetch(`/api/compromissos/${c.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Não consegui excluir o compromisso.');
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== c.id));
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
          const doDia = items.filter((c) => c.diaSemana === dia);
          if (doDia.length === 0) return null;
          return (
            <div key={dia}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {diaSemanaLabel[dia]}
              </h2>
              <ul className="space-y-2">
                {doDia.map((c) =>
                  editingId === c.id ? (
                    <li key={c.id}>
                      <CompromissoForm
                        initial={toForm(c)}
                        frentes={frentes}
                        busy={busy}
                        onSubmit={(form) => handleUpdate(c.id, form)}
                        onCancel={() => {
                          setEditingId(null);
                          setError(null);
                        }}
                      />
                    </li>
                  ) : (
                    <CompromissoRow
                      key={c.id}
                      compromisso={c}
                      frente={c.frenteId ? frenteById.get(c.frenteId) : undefined}
                      onEdit={() => {
                        setEditingId(c.id);
                        setAdding(false);
                        setError(null);
                      }}
                      onDelete={() => handleDelete(c)}
                    />
                  ),
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {items.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhum compromisso fixo ainda. Adicione treino, mentorias, lives…
        </p>
      )}

      {adding ? (
        <CompromissoForm
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
          Novo compromisso
        </button>
      )}

      <div className="border-t border-border pt-4 text-sm text-muted-foreground">
        {items.length} {items.length === 1 ? 'compromisso fixo' : 'compromissos fixos'} na
        semana
      </div>
    </div>
  );
}

function toForm(c: CompromissoDTO): FormState {
  return {
    diaSemana: c.diaSemana,
    horaInicio: c.horaInicio,
    horaFim: c.horaFim,
    descricao: c.descricao,
    frenteId: c.frenteId ?? '',
    categoria: c.categoria,
  };
}

function CompromissoRow({
  compromisso: c,
  frente,
  onEdit,
  onDelete,
}: {
  compromisso: CompromissoDTO;
  frente?: FrenteOption;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-semibold">
        <Clock className="h-3 w-3" />
        {c.horaInicio}–{c.horaFim}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{c.descricao}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {frente && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
              style={{ backgroundColor: `${frente.cor}22`, color: frente.cor }}
            >
              {frente.icone} {frente.nome}
            </span>
          )}
          <span>{categoriaLabel[c.categoria]}</span>
        </p>
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

function CompromissoForm({
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

  const fieldClass =
    'rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-primary/40 bg-card p-4 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Categoria</span>
          <select
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value as Categoria)}
            className={fieldClass}
          >
            {categoriaValues.map((cat) => (
              <option key={cat} value={cat}>
                {categoriaLabel[cat]}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Descrição</span>
          <input
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            placeholder="Ex: Treino, Mentoria ao vivo…"
            autoFocus
            className={fieldClass}
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Frente</span>
          <select
            value={form.frenteId}
            onChange={(e) => set('frenteId', e.target.value)}
            className={fieldClass}
          >
            <option value="">Nenhuma</option>
            {frentes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.icone} {f.nome}
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
