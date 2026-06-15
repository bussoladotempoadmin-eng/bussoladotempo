'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, Check, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { frenteCreateSchema } from '@/lib/schemas/frente';

export type FrenteDTO = {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  orcamentoHoras: number;
  ordem: number;
  ativa: boolean;
};

type FormState = {
  nome: string;
  icone: string;
  cor: string;
  orcamentoHoras: string;
};

const emptyForm: FormState = { nome: '', icone: '📌', cor: '#3b82f6', orcamentoHoras: '0' };

export function FrentesManager({ initialFrentes }: { initialFrentes: FrenteDTO[] }) {
  const [frentes, setFrentes] = React.useState<FrenteDTO[]>(initialFrentes);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totalHoras = frentes
    .filter((f) => f.ativa)
    .reduce((sum, f) => sum + f.orcamentoHoras, 0);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = frentes.findIndex((f) => f.id === active.id);
    const newIndex = frentes.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(frentes, oldIndex, newIndex);
    setFrentes(reordered); // otimista

    const res = await fetch('/api/frentes/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordem: reordered.map((f) => f.id) }),
    });
    if (!res.ok) {
      setError('Não consegui salvar a nova ordem. Recarregue a página.');
      setFrentes(frentes); // desfaz
    }
  }

  async function handleCreate(form: FormState) {
    setError(null);
    const parsed = frenteCreateSchema.safeParse({
      ...form,
      orcamentoHoras: form.orcamentoHoras,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/frentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui criar a frente.');
      return;
    }
    const nova: FrenteDTO = await res.json();
    setFrentes((prev) => [...prev, nova]);
    setAdding(false);
  }

  async function handleUpdate(id: string, form: FormState) {
    setError(null);
    const parsed = frenteCreateSchema.safeParse({
      ...form,
      orcamentoHoras: form.orcamentoHoras,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/frentes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui salvar a frente.');
      return;
    }
    const atualizada: FrenteDTO = await res.json();
    setFrentes((prev) => prev.map((f) => (f.id === id ? atualizada : f)));
    setEditingId(null);
  }

  async function handleToggleAtiva(f: FrenteDTO) {
    setError(null);
    setFrentes((prev) => prev.map((x) => (x.id === f.id ? { ...x, ativa: !x.ativa } : x)));
    const res = await fetch(`/api/frentes/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !f.ativa }),
    });
    if (!res.ok) {
      setError('Não consegui mudar o status da frente.');
      setFrentes((prev) => prev.map((x) => (x.id === f.id ? { ...x, ativa: f.ativa } : x)));
    }
  }

  async function handleDelete(f: FrenteDTO) {
    if (!window.confirm(`Excluir a frente "${f.nome}"? Isso não pode ser desfeito.`)) return;
    setError(null);
    const res = await fetch(`/api/frentes/${f.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Não consegui excluir a frente.');
      return;
    }
    setFrentes((prev) => prev.filter((x) => x.id !== f.id));
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={frentes.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {frentes.map((f) =>
              editingId === f.id ? (
                <li key={f.id}>
                  <FrenteForm
                    initial={{
                      nome: f.nome,
                      icone: f.icone,
                      cor: f.cor,
                      orcamentoHoras: String(f.orcamentoHoras),
                    }}
                    busy={busy}
                    onSubmit={(form) => handleUpdate(f.id, form)}
                    onCancel={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                  />
                </li>
              ) : (
                <SortableFrenteRow
                  key={f.id}
                  frente={f}
                  onEdit={() => {
                    setEditingId(f.id);
                    setAdding(false);
                    setError(null);
                  }}
                  onToggleAtiva={() => handleToggleAtiva(f)}
                  onDelete={() => handleDelete(f)}
                />
              ),
            )}
          </ul>
        </SortableContext>
      </DndContext>

      {frentes.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma frente ainda. Crie a primeira pra começar.
        </p>
      )}

      {adding ? (
        <FrenteForm
          initial={emptyForm}
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
          data-tour="frente-nova"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
            setError(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Nova frente
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="text-muted-foreground">
          {frentes.filter((f) => f.ativa).length}{' '}
          {frentes.filter((f) => f.ativa).length === 1 ? 'frente ativa' : 'frentes ativas'}
        </span>
        <span className="font-semibold">
          {totalHoras.toLocaleString('pt-BR')} h/semana orçadas
        </span>
      </div>
    </div>
  );
}

function SortableFrenteRow({
  frente,
  onEdit,
  onToggleAtiva,
  onDelete,
}: {
  frente: FrenteDTO;
  onEdit: () => void;
  onToggleAtiva: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frente.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm',
        !frente.ativa && 'opacity-60',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastar pra reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
        style={{ backgroundColor: `${frente.cor}22` }}
      >
        {frente.icone}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-semibold">
          {frente.nome}
          {!frente.ativa && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Inativa
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {frente.orcamentoHoras.toLocaleString('pt-BR')} h/semana
        </p>
      </div>

      <span
        className="h-4 w-4 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: frente.cor }}
        aria-hidden
      />

      <div className="flex items-center gap-1">
        <IconButton label={frente.ativa ? 'Desativar' : 'Ativar'} onClick={onToggleAtiva}>
          {frente.ativa ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </IconButton>
        <IconButton label="Editar" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Excluir" onClick={onDelete} danger>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </li>
  );
}

function FrenteForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  busy: boolean;
  onSubmit: (form: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(initial);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-primary/40 bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Ícone</span>
          <input
            value={form.icone}
            onChange={(e) => set('icone', e.target.value)}
            maxLength={8}
            className="w-16 rounded-lg border border-border bg-background px-3 py-2 text-center text-lg"
          />
        </label>

        <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Nome</span>
          <input
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Ex: Doctum"
            autoFocus
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Horas/sem</span>
          <input
            value={form.orcamentoHoras}
            onChange={(e) => set('orcamentoHoras', e.target.value)}
            inputMode="decimal"
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Cor</span>
          <input
            type="color"
            value={form.cor}
            onChange={(e) => set('cor', e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background"
          />
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

function IconButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        danger && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      {children}
    </button>
  );
}
