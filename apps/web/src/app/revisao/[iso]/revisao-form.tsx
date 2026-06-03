'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { categoriaLabel, type Categoria } from '@/lib/schemas/compromisso';
import type { TipoInsight } from '@bussola/domain';

export interface RevisaoData {
  semanaIso: string;
  rangeLabel: string;
  proximaIso: string;
  proximaRangeLabel: string;
  resumo: { totalGeral: number; importante: number; urgente: number; disperso: number };
  desvios: {
    tarefa: string;
    frenteNome: string;
    frenteIcone: string;
    planejada: Categoria;
    realizada: Categoria;
    horas: number;
  }[];
  insights: { tipo: TipoInsight; titulo: string; texto: string }[];
  initial: {
    retroFuncionou: string;
    retroNaoFuncionou: string;
    retroMudanca: string;
    sensacaoMedia: number | null;
    fechada: boolean;
    riscoProxima: string;
    prioridadesProxima: string[];
  };
}

const insightClasses: Record<TipoInsight, string> = {
  GOOD: 'border-emerald-500/30 bg-emerald-500/10',
  WARN: 'border-amber-500/30 bg-amber-500/10',
  TIP: 'border-sky-500/30 bg-sky-500/10',
  NEUTRAL: 'border-border bg-card',
};

const PASSOS = ['Espelho', 'Desvios & Coach', 'Retrospectiva', 'Próxima semana'];

export function RevisaoForm({ data }: { data: RevisaoData }) {
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [funcionou, setFuncionou] = React.useState(data.initial.retroFuncionou);
  const [naoFuncionou, setNaoFuncionou] = React.useState(data.initial.retroNaoFuncionou);
  const [mudanca, setMudanca] = React.useState(data.initial.retroMudanca);
  const [sensacao, setSensacao] = React.useState<number | null>(data.initial.sensacaoMedia);
  const [risco, setRisco] = React.useState(data.initial.riscoProxima);
  const [prioridades, setPrioridades] = React.useState<string[]>([
    data.initial.prioridadesProxima[0] ?? '',
    data.initial.prioridadesProxima[1] ?? '',
    data.initial.prioridadesProxima[2] ?? '',
  ]);

  function pct(f: number) {
    return `${Math.round(f * 100)}%`;
  }

  async function salvar(fechar: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/semanas/${data.semanaIso}/revisao`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        retroFuncionou: funcionou,
        retroNaoFuncionou: naoFuncionou,
        retroMudanca: mudanca,
        sensacaoMedia: sensacao,
        riscoProxima: risco,
        prioridadesProxima: prioridades.map((p) => p.trim()).filter(Boolean),
        fechar,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui salvar a revisão. Tente de novo.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold">Revisão salva!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bora planejar a próxima semana ({data.proximaIso} · {data.proximaRangeLabel}).
        </p>
        <Link
          href={`/semana/${data.proximaIso}`}
          className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Planejar {data.proximaIso}
        </Link>
      </div>
    );
  }

  const textareaClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      {/* Stepper header */}
      <ol className="flex items-center gap-2 text-xs">
        {PASSOS.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </button>
            <span className={i === step ? 'font-semibold' : 'text-muted-foreground'}>{p}</span>
            {i < PASSOS.length - 1 && <span className="text-muted-foreground">·</span>}
          </li>
        ))}
      </ol>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        {/* Passo 1 — Espelho */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold">Como foi a semana que passou</h2>
            {data.resumo.totalGeral === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Sem blocos registrados nesta semana. Você ainda pode escrever a
                retrospectiva, mas não há espelho pra mostrar.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Total" valor={`${data.resumo.totalGeral.toLocaleString('pt-BR')}h`} />
                <Stat label="🎯 Importante" valor={pct(data.resumo.importante)} />
                <Stat label="🔥 Urgente" valor={pct(data.resumo.urgente)} />
                <Stat label="💨 Disperso" valor={pct(data.resumo.disperso)} />
              </div>
            )}
          </div>
        )}

        {/* Passo 2 — Desvios + insights */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Maiores desvios</h2>
              {data.desvios.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum bloco desviou do planejado. 👏
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.desvios.map((d, i) => (
                    <li key={i} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-semibold">{d.tarefa}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.frenteIcone} {d.frenteNome} · {categoriaLabel[d.planejada]} →{' '}
                        {categoriaLabel[d.realizada]} · {d.horas.toLocaleString('pt-BR')}h
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">Coach Gentil</h2>
              <div className="mt-3 space-y-2">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${insightClasses[ins.tipo]}`}>
                    <p className="text-sm font-bold">{ins.titulo}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{ins.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Passo 3 — Retrospectiva */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Retrospectiva</h2>
            <Campo label="O que funcionou?" value={funcionou} onChange={setFuncionou} className={textareaClass} />
            <Campo label="O que não funcionou?" value={naoFuncionou} onChange={setNaoFuncionou} className={textareaClass} />
            <Campo label="O que vou mudar na próxima?" value={mudanca} onChange={setMudanca} className={textareaClass} />
            <div>
              <p className="mb-1 text-sm font-semibold">Como você se sentiu? (1-5)</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSensacao(n)}
                    className={`h-10 w-10 rounded-lg border text-sm font-bold transition-colors ${
                      sensacao === n
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Passo 4 — Próxima semana */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Preparar {data.proximaIso}</h2>
            <p className="text-xs text-muted-foreground">{data.proximaRangeLabel}</p>
            <Campo
              label="Maior risco da próxima semana"
              value={risco}
              onChange={setRisco}
              className={textareaClass}
            />
            <div className="space-y-2">
              <p className="text-sm font-semibold">3 prioridades da próxima semana</p>
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  value={prioridades[i]}
                  onChange={(e) =>
                    setPrioridades((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                  }
                  placeholder={`Prioridade ${i + 1}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>

        {step < PASSOS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(PASSOS.length - 1, s + 1))}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => salvar(false)}
              disabled={busy}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              onClick={() => salvar(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Concluir revisão
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{valor}</p>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={className}
      />
    </label>
  );
}
