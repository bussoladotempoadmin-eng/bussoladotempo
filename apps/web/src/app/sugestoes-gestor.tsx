'use client';

import * as React from 'react';
import { Lightbulb, Check, X, Loader2 } from 'lucide-react';
import type { SugestaoRecebida } from '@/lib/equipe';

export function SugestoesGestor({ inicial }: { inicial: SugestaoRecebida[] }) {
  const [lista, setLista] = React.useState(inicial);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function responder(id: string, status: 'ACEITA' | 'DISPENSADA') {
    setBusy(id);
    await fetch('/api/equipe/sugestao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setBusy(null);
    setLista((prev) => prev.filter((s) => s.id !== id));
  }

  if (lista.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-400">
        <Lightbulb className="h-4 w-4" />
        {lista.length === 1 ? 'Sugestão do seu gestor' : 'Sugestões do seu gestor'}
      </p>
      <div className="space-y-2">
        {lista.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm">{s.texto}</p>
            <p className="mt-1 text-xs text-muted-foreground">— {s.deNome}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => responder(s.id, 'ACEITA')}
                disabled={busy === s.id}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Topo, vou aplicar
              </button>
              <button
                type="button"
                onClick={() => responder(s.id, 'DISPENSADA')}
                disabled={busy === s.id}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                <X className="h-3 w-3" />
                Dispensar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
