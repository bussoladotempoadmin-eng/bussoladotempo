'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';

export function TiposView({
  inicial,
  ehDono,
}: {
  inicial: { id: string; nome: string }[];
  ehDono: boolean;
}) {
  const router = useRouter();
  const [nome, setNome] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function adicionar() {
    if (!nome.trim()) return;
    setBusy(true);
    setErro(null);
    const r = await fetch('/api/comercial/tipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui adicionar.');
      return;
    }
    setNome('');
    router.refresh();
  }

  async function remover(id: string) {
    await fetch('/api/comercial/tipos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      {ehDono && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-bold">Criar um tipo novo</p>
          <div className="flex flex-wrap items-end gap-3">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              placeholder="Ex: Carro de som, Live, Parceria com igreja..."
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={adicionar}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
          {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {inicial.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold"
          >
            {t.nome}
            {ehDono && (
              <button
                type="button"
                onClick={() => remover(t.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {inicial.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>}
      </div>
    </div>
  );
}
