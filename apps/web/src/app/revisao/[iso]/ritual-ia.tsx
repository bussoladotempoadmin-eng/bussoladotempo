'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, X, Lightbulb, Check, Calendar, Pencil, Plus } from 'lucide-react';
import { shiftIsoWeek } from '@/lib/iso-week';
import { BlocoForm, type FormState, type FrenteOption } from '../../semana/[iso]/blocos-manager';
import type { DiaSemana, Categoria } from '@/lib/schemas/compromisso';

type Frente = FrenteOption;
type PropostaBloco = {
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  tarefa: string;
  frenteId: string;
  categoriaPlanejada: string;
};

function propParaForm(b: PropostaBloco): FormState {
  return {
    diaSemana: b.diaSemana as DiaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    frenteId: b.frenteId,
    categoriaPlanejada: b.categoriaPlanejada as Categoria,
    categoriaRealizada: b.categoriaPlanejada as Categoria,
  };
}

function formParaProp(f: FormState): PropostaBloco {
  return {
    diaSemana: f.diaSemana,
    horaInicio: f.horaInicio,
    horaFim: f.horaFim,
    tarefa: f.tarefa,
    frenteId: f.frenteId,
    categoriaPlanejada: f.categoriaPlanejada,
  };
}
type Proposta = {
  resumo: string;
  blocos: PropostaBloco[];
  semanasComDados: number;
  poucoHistorico: boolean;
};
type Resultado = { analise: string[]; proposta: Proposta; proximaIso: string };

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

export function RitualIA({
  semanaIso,
  frentes,
  inicial,
}: {
  semanaIso: string;
  frentes: Frente[];
  inicial?: Resultado | null;
}) {
  const frenteById = React.useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [res, setRes] = React.useState<Resultado | null>(inicial ?? null);
  const [blocos, setBlocos] = React.useState<PropostaBloco[]>(inicial?.proposta.blocos ?? []);
  const [repetir, setRepetir] = React.useState(1);
  const [aplicando, setAplicando] = React.useState(false);
  const [aplicado, setAplicado] = React.useState<{ criadas: string[]; puladas: string[] } | null>(null);
  // null = fechado; { idx: número } = editando aquele bloco; { idx: null } = adicionando.
  const [editando, setEditando] = React.useState<{ idx: number | null } | null>(null);

  function salvarBloco(form: FormState) {
    const novo = formParaProp(form);
    setBlocos((prev) => {
      if (editando?.idx == null) return [...prev, novo];
      return prev.map((b, i) => (i === editando.idx ? novo : b));
    });
    setEditando(null);
  }

  const formInicial: FormState =
    editando?.idx != null && blocos[editando.idx]
      ? propParaForm(blocos[editando.idx])
      : {
          diaSemana: 'SEG',
          horaInicio: '09:00',
          horaFim: '10:00',
          tarefa: '',
          frenteId: frentes[0]?.id ?? '',
          categoriaPlanejada: 'IMPORTANTE',
          categoriaRealizada: 'IMPORTANTE',
        };

  async function gerar(force: boolean) {
    setLoading(true);
    setError(null);
    setAplicado(null);
    try {
      const r = await fetch('/api/agenda-ia/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semanaIso, force }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setError(d?.error ?? 'Não consegui revisar e planejar.');
        return;
      }
      const data: Resultado = await r.json();
      setRes(data);
      setBlocos(data.proposta.blocos);
    } catch {
      setError('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  }

  function gerarClick() {
    // Sem resultado ainda → gera (pega cache se houver). Com resultado → regenera
    // (gasta crédito), pedindo confirmação.
    if (res) {
      if (!window.confirm('Gerar de novo usa créditos da IA e substitui o resultado guardado. Continuar?'))
        return;
      gerar(true);
    } else {
      gerar(false);
    }
  }

  function isosAlvo(proximaIso: string): string[] {
    return Array.from({ length: repetir }, (_, i) => shiftIsoWeek(proximaIso, i));
  }

  async function aplicar(substituir = false) {
    if (!res) return;
    setAplicando(true);
    setError(null);
    const r = await fetch('/api/agenda-ia/aplicar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isos: isosAlvo(res.proximaIso), substituir, blocos }),
    });
    setAplicando(false);
    if (!r.ok) {
      setError('Não consegui salvar a agenda.');
      return;
    }
    const d: { criadas: string[]; puladas: string[] } = await r.json();
    if (d.criadas.length === 0 && d.puladas.length > 0) {
      if (window.confirm(`${d.puladas.join(', ')} já tinha(m) blocos. Substituir pelo padrão da IA?`)) {
        return aplicar(true);
      }
      return;
    }
    setAplicado(d);
  }

  const blocosComIdx = blocos.map((b, idx) => ({ b, idx }));

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Revisar & Planejar com a IA</h2>
        </div>
        <button
          type="button"
          onClick={gerarClick}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {res ? 'Gerar de novo' : 'Revisar & Planejar'}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Num comando só: a IA analisa esta semana e propõe a próxima, aprendendo do que rolou.
      </p>
      {res && !loading && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          ✓ Resultado guardado — reabrir esta tela não gasta crédito.
        </p>
      )}

      {loading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Analisando a semana e montando a próxima… alguns segundos. ✨
        </p>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {res && (
        <div className="mt-5 space-y-5">
          {/* Análise da semana que passou */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" /> Análise da semana
            </p>
            {res.analise.length > 0 ? (
              <ul className="space-y-2">
                {res.analise.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem padrões fortes pra apontar.</p>
            )}
          </div>

          {/* Proposta da próxima semana */}
          {!aplicado && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Proposta para {res.proximaIso}
              </p>
              {res.proposta.poucoHistorico && (
                <p className="mb-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-muted-foreground">
                  Histórico ainda curto — esta proposta é um ponto de partida e melhora conforme você usa.
                </p>
              )}
              {res.proposta.resumo && (
                <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">{res.proposta.resumo}</p>
              )}

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
                              className="group relative rounded-lg px-2.5 py-1.5 pr-12"
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
                                onClick={() => setEditando({ idx })}
                                className="absolute right-6 top-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                                aria-label="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setBlocos((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                aria-label="Remover"
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

              <button
                type="button"
                onClick={() => setEditando({ idx: null })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar bloco
              </button>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Aplicar em:</span>
                <div className="inline-flex rounded-lg border border-border p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRepetir(1)}
                    className={repetir === 1 ? 'rounded-md bg-primary px-3 py-1 text-primary-foreground' : 'rounded-md px-3 py-1 text-muted-foreground hover:text-foreground'}
                  >
                    Próxima semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepetir(4)}
                    className={repetir === 4 ? 'rounded-md bg-primary px-3 py-1 text-primary-foreground' : 'rounded-md px-3 py-1 text-muted-foreground hover:text-foreground'}
                  >
                    Próximas 4 (mês)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => aplicar()}
                disabled={aplicando || blocos.length === 0}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
              >
                {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {repetir === 1
                  ? `Confirmar agenda de ${res.proximaIso}`
                  : `Confirmar nas próximas ${repetir} semanas`}
              </button>
            </div>
          )}

          {aplicado && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  ✓ Agenda criada em {aplicado.criadas.length}{' '}
                  {aplicado.criadas.length === 1 ? 'semana' : 'semanas'}
                  {aplicado.criadas.length > 0 && `: ${aplicado.criadas.join(', ')}`}
                </span>
                {aplicado.criadas[0] && (
                  <Link
                    href={`/semana/${aplicado.criadas[0]}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Abrir {aplicado.criadas[0]}
                  </Link>
                )}
              </div>
              {aplicado.puladas.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Puladas (já tinham blocos): {aplicado.puladas.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setEditando(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 px-1 text-sm font-bold text-white">
              {editando.idx == null ? 'Adicionar bloco' : 'Editar bloco'}
            </h3>
            <BlocoForm
              initial={formInicial}
              frentes={frentes}
              busy={false}
              onSubmit={salvarBloco}
              onCancel={() => setEditando(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
