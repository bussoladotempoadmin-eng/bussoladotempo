'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Trash2, Loader2 } from 'lucide-react';
import type { UnidadeInfo } from '@/lib/comercial';

export function UnidadesView({
  inicial,
  ehDono,
  orgId,
}: {
  inicial: UnidadeInfo[];
  ehDono: boolean;
  orgId: string;
}) {
  const router = useRouter();
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function adicionar() {
    if (!nome.trim()) return;
    setBusy(true);
    setErro(null);
    const r = await fetch('/api/comercial/unidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, nome, coordenadorEmail: email || undefined }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui adicionar.');
      return;
    }
    setNome('');
    setEmail('');
    router.refresh();
  }

  async function remover(id: string) {
    if (!confirm('Remover esta unidade? As ações dela também serão apagadas.')) return;
    await fetch('/api/comercial/unidades', {
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
          <p className="mb-3 text-sm font-bold">Nova unidade</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-semibold text-muted-foreground">Cidade / unidade</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Serra"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-semibold text-muted-foreground">
                E-mail do coordenador (opcional)
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordenador@email.com"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={adicionar}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
          {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            O coordenador vê e edita só as ações da unidade dele. Ele precisa ter entrado no app uma vez.
          </p>
        </div>
      )}

      {inicial.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Nenhuma unidade ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {inicial.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                </span>
                <div>
                  <p className="font-semibold">{u.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.coordenadorNome ? `Coordenador: ${u.coordenadorNome}` : 'Sem coordenador'}
                  </p>
                </div>
              </div>
              {ehDono && (
                <button
                  type="button"
                  onClick={() => remover(u.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
