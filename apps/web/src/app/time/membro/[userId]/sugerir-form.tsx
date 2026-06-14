'use client';

import * as React from 'react';
import { Lightbulb, Loader2, Check } from 'lucide-react';

export function SugerirForm({ paraUserId, primeiroNome }: { paraUserId: string; primeiroNome: string }) {
  const [aberto, setAberto] = React.useState(false);
  const [texto, setTexto] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [enviado, setEnviado] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function enviar() {
    const t = texto.trim();
    if (!t) return;
    setBusy(true);
    setErro(null);
    const r = await fetch('/api/equipe/sugestao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paraUserId, texto: t }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui enviar.');
      return;
    }
    setEnviado(true);
    setTexto('');
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
        <Check className="mr-1 inline h-4 w-4" />
        Sugestão enviada pra {primeiroNome}. Ela aparece pra ele(a) e ele decide o que fazer.
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Lightbulb className="h-4 w-4" />
        Sugerir foco pra {primeiroNome}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Sugerir pra {primeiroNome}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        É um conselho, não uma ordem — {primeiroNome} vê a sugestão e decide. Você não edita a
        agenda dele(a).
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Ex: tente blindar as quartas de manhã pra trabalho importante, antes das reuniões."
        className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {erro && (
        <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={enviar}
          disabled={busy || !texto.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enviar sugestão
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
