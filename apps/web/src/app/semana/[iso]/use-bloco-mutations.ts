import * as React from 'react';
import type { BlocoDTO, SubTarefa } from './blocos-manager';
import type { Categoria } from '@/lib/schemas/compromisso';

type SetBlocos = React.Dispatch<React.SetStateAction<BlocoDTO[]>>;

export type BlocoUpdateData = {
  diaSemana: BlocoDTO['diaSemana'];
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
};

/**
 * Mutações de bloco/subtarefa reutilizáveis (lista, calendário e modal).
 * Atualizam o estado compartilhado e persistem na API.
 */
export function useBlocoMutations(setBlocos: SetBlocos, semanaIso: string) {
  const createBloco = React.useCallback(
    async (data: BlocoUpdateData) => {
      const res = await fetch('/api/blocos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, semanaIso }),
      });
      if (!res.ok) return false;
      const novo: BlocoDTO = await res.json();
      setBlocos((prev) => [...prev, { ...novo, subtarefas: [] }]);
      return true;
    },
    [setBlocos, semanaIso],
  );

  const updateBloco = React.useCallback(
    async (id: string, data: BlocoUpdateData) => {
      const res = await fetch(`/api/blocos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return false;
      const at: BlocoDTO = await res.json();
      setBlocos((prev) => prev.map((b) => (b.id === id ? { ...at, subtarefas: b.subtarefas } : b)));
      return true;
    },
    [setBlocos],
  );

  const deleteBloco = React.useCallback(
    async (id: string) => {
      const res = await fetch(`/api/blocos/${id}`, { method: 'DELETE' });
      if (!res.ok) return false;
      setBlocos((prev) => prev.filter((b) => b.id !== id));
      return true;
    },
    [setBlocos],
  );

  const togglePrioridade = React.useCallback(
    async (id: string, marcar: boolean) => {
      const res = await fetch(`/api/blocos/${id}/prioridade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marcar }),
      });
      if (!res.ok) return false;
      const at: BlocoDTO = await res.json();
      setBlocos((prev) =>
        prev.map((b) => (b.id === id ? { ...b, prioridadeSemana: at.prioridadeSemana } : b)),
      );
      return true;
    },
    [setBlocos],
  );

  const registrarRealizado = React.useCallback(
    async (
      id: string,
      resultado: 'SIM' | 'URGENTE' | 'DISPERSO',
      opts?: { concluidoEm?: string; horaRealInicio?: string; horaRealFim?: string },
    ) => {
      const res = await fetch(`/api/blocos/${id}/realizado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado, ...opts }),
      });
      if (!res.ok) return false;
      const at: BlocoDTO = await res.json();
      setBlocos((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                categoriaRealizada: at.categoriaRealizada,
                concluido: at.concluido,
                concluidoEm: at.concluidoEm,
                horaRealInicio: at.horaRealInicio,
                horaRealFim: at.horaRealFim,
              }
            : b,
        ),
      );
      return true;
    },
    [setBlocos],
  );

  const reabrirBloco = React.useCallback(
    async (id: string) => {
      const res = await fetch(`/api/blocos/${id}/realizado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reabrir: true }),
      });
      if (!res.ok) return false;
      setBlocos((prev) =>
        prev.map((b) => (b.id === id ? { ...b, concluido: false, concluidoEm: null } : b)),
      );
      return true;
    },
    [setBlocos],
  );

  const addTarefa = React.useCallback(
    async (blocoId: string, texto: string, hora: string | null, horaFim: string | null = null) => {
      const res = await fetch(`/api/blocos/${blocoId}/tarefas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, hora, horaFim }),
      });
      if (!res.ok) return;
      const t: SubTarefa = await res.json();
      setBlocos((prev) =>
        prev.map((b) => (b.id === blocoId ? { ...b, subtarefas: [...b.subtarefas, t] } : b)),
      );
    },
    [setBlocos],
  );

  const toggleTarefa = React.useCallback(
    async (blocoId: string, tarefaId: string, feito: boolean) => {
      setBlocos((prev) =>
        prev.map((b) =>
          b.id === blocoId
            ? { ...b, subtarefas: b.subtarefas.map((t) => (t.id === tarefaId ? { ...t, feito } : t)) }
            : b,
        ),
      );
      await fetch(`/api/tarefas/${tarefaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feito }),
      });
    },
    [setBlocos],
  );

  const deleteTarefa = React.useCallback(
    async (blocoId: string, tarefaId: string) => {
      await fetch(`/api/tarefas/${tarefaId}`, { method: 'DELETE' });
      setBlocos((prev) =>
        prev.map((b) =>
          b.id === blocoId ? { ...b, subtarefas: b.subtarefas.filter((t) => t.id !== tarefaId) } : b,
        ),
      );
    },
    [setBlocos],
  );

  const updateTarefaHora = React.useCallback(
    async (blocoId: string, tarefaId: string, hora: string | null) => {
      setBlocos((prev) =>
        prev.map((b) =>
          b.id === blocoId
            ? { ...b, subtarefas: b.subtarefas.map((t) => (t.id === tarefaId ? { ...t, hora } : t)) }
            : b,
        ),
      );
      await fetch(`/api/tarefas/${tarefaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hora }),
      });
    },
    [setBlocos],
  );

  const updateTarefaFim = React.useCallback(
    async (blocoId: string, tarefaId: string, horaFim: string | null) => {
      setBlocos((prev) =>
        prev.map((b) =>
          b.id === blocoId
            ? { ...b, subtarefas: b.subtarefas.map((t) => (t.id === tarefaId ? { ...t, horaFim } : t)) }
            : b,
        ),
      );
      await fetch(`/api/tarefas/${tarefaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horaFim }),
      });
    },
    [setBlocos],
  );

  return {
    createBloco,
    updateBloco,
    deleteBloco,
    togglePrioridade,
    registrarRealizado,
    reabrirBloco,
    addTarefa,
    toggleTarefa,
    deleteTarefa,
    updateTarefaHora,
    updateTarefaFim,
  };
}
