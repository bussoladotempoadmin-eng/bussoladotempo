'use client';

import * as React from 'react';
import { signOut } from 'next-auth/react';
import { Download, Trash2, Loader2 } from 'lucide-react';

export function ContaActions() {
  const [excluindo, setExcluindo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function deletarConta() {
    const ok = window.confirm(
      'Tem certeza? Isso apaga PERMANENTEMENTE sua conta e TODOS os seus dados (frentes, semanas, blocos, revisões). Não dá pra desfazer.',
    );
    if (!ok) return;
    const ok2 = window.confirm('Última confirmação: apagar tudo mesmo?');
    if (!ok2) return;

    setExcluindo(true);
    setError(null);
    const res = await fetch('/api/conta', { method: 'DELETE' });
    if (!res.ok) {
      setExcluindo(false);
      setError('Não consegui apagar a conta. Tente de novo.');
      return;
    }
    await signOut({ callbackUrl: '/' });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-bold">Seus dados (LGPD)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixe uma cópia de tudo que a Bússola guarda sobre você, em JSON.
        </p>
        <a
          href="/api/exportar"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Exportar meus dados
        </a>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-sm font-bold text-destructive">Zona de perigo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Apaga sua conta e todos os dados permanentemente. Não tem volta.
        </p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={deletarConta}
          disabled={excluindo}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Deletar minha conta
        </button>
      </div>
    </div>
  );
}
