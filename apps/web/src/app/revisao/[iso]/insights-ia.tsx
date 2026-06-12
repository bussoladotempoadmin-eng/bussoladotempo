'use client';

import * as React from 'react';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';

export function InsightsIA({ semanaIso, temBlocos }: { semanaIso: string; temBlocos: boolean }) {
  const [loading, setLoading] = React.useState(false);
  const [insights, setInsights] = React.useState<string[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function analisar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agenda-ia/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semanaIso }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? 'Não consegui analisar a semana.');
        return;
      }
      const d: { insights: string[] } = await res.json();
      setInsights(d.insights);
    } catch {
      setError('Falha de conexão ao analisar.');
    } finally {
      setLoading(false);
    }
  }

  if (!temBlocos) return null;

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Análise da IA</h2>
        </div>
        <button
          type="button"
          onClick={analisar}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {insights ? 'Analisar de novo' : 'Analisar a semana'}
        </button>
      </div>

      {loading && (
        <p className="mt-3 text-sm text-muted-foreground">Lendo sua semana… ✨</p>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {insights && !loading && (
        insights.length > 0 ? (
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
            Sem padrões fortes pra apontar nesta semana.
          </p>
        )
      )}
    </div>
  );
}
