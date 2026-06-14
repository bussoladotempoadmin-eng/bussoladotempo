'use client';

import * as React from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

type ToastTipo = 'sucesso' | 'erro' | 'info';
type Toast = { id: number; msg: string; tipo: ToastTipo };

type ToastCtx = { toast: (msg: string, tipo?: ToastTipo) => void };

const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const c = React.useContext(Ctx);
  // Fallback seguro: se usado fora do provider, não quebra (no-op).
  return c ?? { toast: () => {} };
}

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = React.useState<Toast[]>([]);

  const remover = React.useCallback((id: number) => {
    setLista((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (msg: string, tipo: ToastTipo = 'sucesso') => {
      const id = ++seq;
      setLista((prev) => [...prev, { id, msg, tipo }]);
      setTimeout(() => remover(id), 2800);
    },
    [remover],
  );

  const valor = React.useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
        {lista.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remover(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const cor =
    toast.tipo === 'sucesso'
      ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
      : toast.tipo === 'erro'
        ? 'border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/80 dark:text-red-200'
        : 'border-border bg-card text-foreground';
  const Icon = toast.tipo === 'sucesso' ? Check : toast.tipo === 'erro' ? AlertCircle : Info;

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm animate-in items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${cor}`}
      style={{ animation: 'toastIn .18s ease-out' }}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <span className="flex-1">{toast.msg}</span>
      <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
