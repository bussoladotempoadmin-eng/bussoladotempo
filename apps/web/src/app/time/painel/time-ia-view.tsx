'use client';

import * as React from 'react';
import { Sparkles, Loader2, Lightbulb, Check } from 'lucide-react';

export function TimeIAView({ semana, inicial }: { semana: string; inicial: string[] | null }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<string[] | null>(inicial ?? null);

  async function gerar() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/equipe/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setError(d?.error ?? 'Não consegui analisar o time.');
        return;
      }
      const d: { insights: string[] } = await r.json();
      setInsights(d.insights);
    } catch {
      setError('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Análise da IA do time</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            premium
          </span>
        </div>
        {!insights && (
          <button
            type="button"
            onClick={gerar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analisar o time
          </button>
        )}
        {insights && !loading && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Gerado nesta semana
          </span>
        )}
      </div>

      {loading && <p className="mt-3 text-sm text-muted-foreground">Lendo o tempo do time… ✨</p>}
      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {insights &&
        !loading &&
        (insights.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {insights.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda não há registro suficiente do time pra uma análise.
          </p>
        ))}

      {insights && !loading && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          ✓ Resultado guardado — reabrir não gasta crédito. Disponível de novo na próxima semana.
        </p>
      )}
    </div>
  );
}
