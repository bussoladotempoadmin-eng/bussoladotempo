'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, X, Lightbulb, Check } from 'lucide-react';

type Frente = { id: string; nome: string; icone: string; cor: string };
type PropostaBloco = {
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: string;
};
type Proposta = {
  resumo: string;
  insights: string[];
  blocos: PropostaBloco[];
  semanasComDados: number;
  poucoHistorico: boolean;
};

const DIAS: { key: string; label: string }[] = [
  { key: 'SEG', label: 'Segunda' },
  { key: 'TER', label: 'Terça' },
  { key: 'QUA', label: 'Quarta' },
  { key: 'QUI', label: 'Quinta' },
  { key: 'SEX', label: 'Sexta' },
  { key: 'SAB', label: 'Sábado' },
  { key: 'DOM', label: 'Domingo' },
];

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function AgendaIAView({
  frentes,
  semanas,
}: {
  frentes: Frente[];
  semanas: { iso: string; label: string }[];
}) {
  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  // Default: próxima semana (índice 1), que é o caso de uso mais comum.
  const [alvo, setAlvo] = React.useState(semanas[1]?.iso ?? semanas[0]?.iso ?? '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposta, setProposta] = React.useState<Proposta | null>(null);
  const [aplicando, setAplicando] = React.useState(false);
  const [aplicado, setAplicado] = React.useState<{ iso: string; count: number } | null>(null);

  async function gerar() {
    setLoading(true);
    setError(null);
    setProposta(null);
    setAplicado(null);
    try {
      const res = await fetch('/api/agenda-ia/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semanaIso: alvo }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? 'Não consegui gerar a agenda. Tente de novo.');
        return;
      }
      setProposta(await res.json());
    } catch {
      setError('Falha de conexão ao gerar a agenda.');
    } finally {
      setLoading(false);
    }
  }

  function removerBloco(idx: number) {
    setProposta((p) => (p ? { ...p, blocos: p.blocos.filter((_, i) => i !== idx) } : p));
  }

  async function aplicar(substituir = false) {
    if (!proposta) return;
    setAplicando(true);
    setError(null);
    const res = await fetch('/api/agenda-ia/aplicar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semanaIso: alvo, substituir, blocos: proposta.blocos }),
    });
    if (res.status === 409) {
      setAplicando(false);
      const d = await res.json().catch(() => null);
      if (
        window.confirm(
          `A semana ${alvo} já tem ${d?.total ?? ''} blocos. Substituir todos pela agenda da IA?`,
        )
      ) {
        return aplicar(true);
      }
      return;
    }
    setAplicando(false);
    if (!res.ok) {
      setError('Não consegui salvar a agenda nessa semana.');
      return;
    }
    const d = await res.json();
    setAplicado({ iso: alvo, count: d.count });
  }

  // Indexa blocos com seu índice original (pra remover certo após filtrar por dia).
  const blocosComIdx = (proposta?.blocos ?? []).map((b, idx) => ({ b, idx }));

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold">Gerar com IA</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          aprende do seu histórico
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        A IA olha suas últimas semanas (o que você planejou × o que realmente rolou),
        seus compromissos fixos e orçamentos, e propõe a semana. Você revisa e confirma.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-muted-foreground">Semana-alvo:</label>
        <select
          value={alvo}
          onChange={(e) => setAlvo(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          {semanas.map((s) => (
            <option key={s.iso} value={s.iso}>
              {s.iso} · {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={gerar}
          disabled={loading || !alvo}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {proposta ? 'Gerar de novo' : 'Gerar agenda'}
        </button>
      </div>

      {loading && (
        <p className="mt-3 text-sm text-muted-foreground">
          A IA está montando sua semana… isso leva alguns segundos. ✨
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {proposta && !aplicado && (
        <div className="mt-5 space-y-4">
          {proposta.poucoHistorico && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
              <p className="font-semibold text-sky-700 dark:text-sky-400">
                Histórico ainda curto ({proposta.semanasComDados}{' '}
                {proposta.semanasComDados === 1 ? 'semana' : 'semanas'} com dados)
              </p>
              <p className="text-muted-foreground">
                Esta proposta é um bom ponto de partida, montada mais pelos seus
                orçamentos e compromissos. Conforme você usa a Bússola, a IA aprende seus
                padrões e as próximas ficam cada vez mais afiadas. 🎯
              </p>
            </div>
          )}

          {proposta.resumo && (
            <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm">{proposta.resumo}</p>
          )}

          {proposta.insights.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Lightbulb className="h-3.5 w-3.5" /> Insights
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {proposta.insights.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Grid da semana proposta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DIAS.map((dia) => {
              const itens = blocosComIdx
                .filter(({ b }) => b.diaSemana === dia.key)
                .sort((a, c) => toMin(a.b.horaInicio) - toMin(c.b.horaInicio));
              if (itens.length === 0) return null;
              return (
                <div key={dia.key} className="rounded-xl border border-border bg-background p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {dia.label}
                  </h3>
                  <div className="space-y-1.5">
                    {itens.map(({ b, idx }) => {
                      const f = frenteById.get(b.frenteId);
                      return (
                        <div
                          key={idx}
                          className="group relative rounded-lg px-2.5 py-1.5 pr-7"
                          style={{
                            backgroundColor: f ? `${f.cor}1f` : undefined,
                            borderLeft: `3px solid ${f?.cor ?? '#999'}`,
                          }}
                        >
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {b.horaInicio}–{b.horaFim}
                          </p>
                          <p className="text-xs font-semibold">
                            {f ? `${f.icone} ` : ''}
                            {b.tarefa}
                          </p>
                          <button
                            type="button"
                            onClick={() => removerBloco(idx)}
                            className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            aria-label="Remover bloco"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {proposta.blocos.length} blocos propostos. Remova o que não quiser (passe o
            mouse no bloco) e confirme — você ajusta o resto na tela da Semana.
          </p>

          <button
            type="button"
            onClick={() => aplicar()}
            disabled={aplicando || proposta.blocos.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
          >
            {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmar e salvar em {alvo}
          </button>
        </div>
      )}

      {aplicado && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            ✓ {aplicado.count} blocos criados em {aplicado.iso}
          </span>
          <Link
            href={`/semana/${aplicado.iso}`}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Abrir a semana
          </Link>
        </div>
      )}
    </div>
  );
}
