'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, Loader2, Clock } from 'lucide-react';

type Frente = { id: string; nome: string; icone: string; cor: string };
type Bloco = {
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  frenteId: string;
  tarefa: string;
  categoriaPlanejada: string;
};
type Compromisso = {
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  descricao: string;
};
type AvisoCapacidade = {
  excedeu: boolean;
  horasOrcadas: number;
  horasAlocadas: number;
  horasFaltando: number;
};
type Resposta = {
  blocos: Bloco[];
  avisoCapacidade: AvisoCapacidade;
  frentes: Frente[];
  compromissos: Compromisso[];
};

const DIAS: { key: string; label: string }[] = [
  { key: 'SEG', label: 'Segunda' },
  { key: 'TER', label: 'Terça' },
  { key: 'QUA', label: 'Quarta' },
  { key: 'QUI', label: 'Quinta' },
  { key: 'SEX', label: 'Sexta' },
];

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dur(b: { horaInicio: string; horaFim: string }): number {
  return (toMin(b.horaFim) - toMin(b.horaInicio)) / 60;
}

export function AgendaPadraoView({
  frentesCount,
  compromissosCount,
  semanas,
}: {
  frentesCount: number;
  compromissosCount: number;
  semanas: { iso: string; label: string }[];
}) {
  const [data, setData] = React.useState<Resposta | null>(null);
  const [aplicando, setAplicando] = React.useState<string | null>(null);
  const [aplicado, setAplicado] = React.useState<{ iso: string; count: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/agenda-padrao', { method: 'POST' });
    setLoading(false);
    if (!res.ok) {
      setError('Não consegui gerar a agenda. Tente de novo.');
      return;
    }
    setData(await res.json());
  }

  async function aplicar(iso: string, substituir = false) {
    setAplicando(iso);
    setError(null);
    const res = await fetch('/api/agenda-padrao/aplicar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semanaIso: iso, substituir }),
    });
    if (res.status === 409) {
      setAplicando(null);
      const d = await res.json().catch(() => null);
      if (
        window.confirm(
          `A semana ${iso} já tem ${d?.total ?? ''} blocos. Substituir todos pela agenda padrão?`,
        )
      ) {
        return aplicar(iso, true);
      }
      return;
    }
    setAplicando(null);
    if (!res.ok) {
      setError('Não consegui aplicar a agenda nessa semana.');
      return;
    }
    const d = await res.json();
    setAplicado({ iso, count: d.count });
  }

  const frenteById = React.useMemo(
    () => new Map((data?.frentes ?? []).map((f) => [f.id, f])),
    [data],
  );

  const horasPorFrente = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const b of data?.blocos ?? []) {
      map.set(b.frenteId, (map.get(b.frenteId) ?? 0) + dur(b));
    }
    return map;
  }, [data]);

  if (frentesCount === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Você ainda não tem frentes ativas. Crie suas frentes primeiro pra gerar a
          agenda.
        </p>
        <Link
          href="/frentes"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Ir pra Frentes
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {data ? 'Regenerar agenda padrão' : 'Gerar agenda padrão'}
        </button>
        <span className="text-xs text-muted-foreground">
          {frentesCount} frentes ativas · {compromissosCount} compromissos fixos
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          {data.avisoCapacidade.excedeu && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Seu orçamento não cabe nos dias úteis
                </p>
                <p className="text-muted-foreground">
                  Você orçou {data.avisoCapacidade.horasOrcadas}h, mas só couberam{' '}
                  {data.avisoCapacidade.horasAlocadas}h de segunda a sexta. Faltaram{' '}
                  {data.avisoCapacidade.horasFaltando}h — considere usar o sábado ou
                  reduzir alguma frente.
                </p>
              </div>
            </div>
          )}

          {/* Legenda + resumo por frente */}
          <div className="flex flex-wrap gap-2">
            {data.frentes.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: `${f.cor}22`, color: f.cor }}
              >
                {f.icone} {f.nome}
                <span className="opacity-70">
                  · {(horasPorFrente.get(f.id) ?? 0).toLocaleString('pt-BR')}h
                </span>
              </span>
            ))}
          </div>

          {/* Grid semanal */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {DIAS.map((dia) => {
              const blocosDoDia = data.blocos.filter((b) => b.diaSemana === dia.key);
              const compsDoDia = data.compromissos.filter((c) => c.diaSemana === dia.key);
              const itens = [
                ...blocosDoDia.map((b) => ({ tipo: 'bloco' as const, ...b })),
                ...compsDoDia.map((c) => ({ tipo: 'comp' as const, ...c })),
              ].sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio));

              return (
                <div key={dia.key} className="rounded-xl border border-border bg-card p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {dia.label}
                  </h3>
                  <div className="space-y-1.5">
                    {itens.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">livre</p>
                    )}
                    {itens.map((item, i) => {
                      if (item.tipo === 'comp') {
                        return (
                          <div
                            key={`c-${i}`}
                            className="rounded-lg border border-dashed border-border bg-muted/50 px-2.5 py-1.5"
                          >
                            <p className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.horaInicio}–{item.horaFim}
                            </p>
                            <p className="truncate text-xs font-medium text-muted-foreground">
                              🔒 {item.descricao}
                            </p>
                          </div>
                        );
                      }
                      const f = frenteById.get(item.frenteId);
                      return (
                        <div
                          key={`b-${i}`}
                          className="rounded-lg px-2.5 py-1.5"
                          style={{
                            backgroundColor: f ? `${f.cor}1f` : undefined,
                            borderLeft: `3px solid ${f?.cor ?? '#999'}`,
                          }}
                        >
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {item.horaInicio}–{item.horaFim}
                          </p>
                          <p className="truncate text-xs font-semibold">
                            {f ? `${f.icone} ${f.nome}` : 'Frente'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Total sugerido: {data.avisoCapacidade.horasAlocadas.toLocaleString('pt-BR')}h
            distribuídas. Sábado e domingo ficam livres por padrão.
          </p>

          {/* Usar como semana */}
          <div className="rounded-xl border border-primary/40 bg-card p-5">
            <h3 className="text-sm font-bold">Usar esta agenda como semana</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Cria os blocos acima de verdade na semana escolhida — daí você ajusta o que
              quiser na tela da Semana.
            </p>
            {aplicado ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
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
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {semanas.map((s) => (
                  <button
                    key={s.iso}
                    type="button"
                    onClick={() => aplicar(s.iso)}
                    disabled={aplicando !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    {aplicando === s.iso && <Loader2 className="h-4 w-4 animate-spin" />}
                    Aplicar em {s.iso}
                    <span className="text-xs font-normal text-muted-foreground">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
