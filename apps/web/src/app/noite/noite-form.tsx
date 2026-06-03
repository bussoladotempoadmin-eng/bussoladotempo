'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Loader2, CheckCircle2 } from 'lucide-react';
import type { DiaSemana, Categoria } from '@/lib/schemas/compromisso';

export type NoiteBloco = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
};

const JS_TO_DIA: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dataLocalHoje(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function NoiteForm({ blocos }: { blocos: NoiteBloco[] }) {
  const [data, setData] = React.useState<string | null>(null);
  const [diaHoje, setDiaHoje] = React.useState<DiaSemana | null>(null);
  const [destaque, setDestaque] = React.useState('');
  const [aprendizado, setAprendizado] = React.useState('');
  const [nota, setNota] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Calcula o dia/data no cliente (timezone do dispositivo) e carrega o fechamento.
  React.useEffect(() => {
    const hoje = dataLocalHoje();
    setData(hoje);
    setDiaHoje(JS_TO_DIA[new Date().getDay()]);
    fetch(`/api/noite?data=${hoje}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.fechamento) {
          setDestaque(d.fechamento.destaque ?? '');
          setAprendizado(d.fechamento.aprendizado ?? '');
          setNota(d.fechamento.nota ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const blocosHoje = React.useMemo(
    () =>
      diaHoje
        ? blocos
            .filter((b) => b.diaSemana === diaHoje)
            .sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio))
        : [],
    [blocos, diaHoje],
  );

  const totalHoras = blocosHoje.reduce(
    (s, b) => s + (toMin(b.horaFim) - toMin(b.horaInicio)) / 60,
    0,
  );
  const comoPlanejado = blocosHoje.filter(
    (b) => b.categoriaRealizada === b.categoriaPlanejada,
  ).length;
  const desvios = blocosHoje.length - comoPlanejado;

  async function salvar() {
    if (!data) return;
    setBusy(true);
    setError(null);
    const res = await fetch('/api/noite', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, destaque, aprendizado, nota }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui salvar. Tente de novo.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold">Dia fechado. 🌙</h2>
        <p className="mt-1 text-sm text-muted-foreground">Descanse — amanhã é outra página.</p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  const textareaClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Resumo do dia */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Como foi seu dia
        </h2>
        {blocosHoje.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum bloco registrado hoje. Tudo bem — escreva mesmo assim.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Mini valor={`${totalHoras.toLocaleString('pt-BR')}h`} label="planejadas" />
            <Mini valor={`${comoPlanejado}`} label="como planejado" />
            <Mini valor={`${desvios}`} label="desviaram" />
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">O que foi bom hoje?</span>
        <textarea
          value={destaque}
          onChange={(e) => setDestaque(e.target.value)}
          rows={3}
          placeholder="Um destaque, uma vitória, um momento bom…"
          className={textareaClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">O que dá pra melhorar amanhã?</span>
        <textarea
          value={aprendizado}
          onChange={(e) => setAprendizado(e.target.value)}
          rows={3}
          placeholder="Um aprendizado, um ajuste pra amanhã…"
          className={textareaClass}
        />
      </label>

      <div>
        <p className="mb-1 text-sm font-semibold">Como você fecha o dia? (1-5)</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              className={`h-10 w-10 rounded-lg border text-sm font-bold transition-colors ${
                nota === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={busy || !data}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Fechar o dia
      </button>
    </div>
  );
}

function Mini({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xl font-extrabold">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
