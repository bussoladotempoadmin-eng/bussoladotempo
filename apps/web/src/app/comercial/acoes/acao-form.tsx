'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Check } from 'lucide-react';
import { useToast } from '@/components/toast';

type Opt = { id: string; nome: string };

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

export type AcaoFormData = {
  unidadeId: string;
  tipo: string;
  objetivo: string;
  local: string;
  responsaveis: string;
  dataInicio: string;
  dataFim: string;
  valorSolicitado: string;
  detalhe: string;
  parcelas?: { valor: string; data: string }[]; // agenda de pagamento (edição prefill)
};

/** Divide um total em N parcelas iguais (centavos), sobra na última. */
function dividirValor(totalStr: string, n: number): string[] {
  const total = Math.round((Number(totalStr) || 0) * 100);
  if (total <= 0 || n <= 0) return Array.from({ length: Math.max(n, 0) }, () => '');
  const base = Math.floor(total / n);
  const arr = Array.from({ length: n }, () => base);
  arr[n - 1] += total - base * n;
  return arr.map((c) => (c / 100).toFixed(2));
}

export function AcaoForm({
  unidades,
  tipos,
  objetivos,
  acaoId,
  inicial,
  onSaved,
  onCancel,
  embedded = false,
}: {
  unidades: Opt[];
  tipos: Opt[];
  objetivos: readonly string[];
  acaoId?: string;
  inicial?: Partial<AcaoFormData>;
  onSaved?: () => void;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [f, setF] = React.useState<AcaoFormData>({
    unidadeId: inicial?.unidadeId ?? unidades[0]?.id ?? '',
    tipo: inicial?.tipo ?? tipos[0]?.nome ?? '',
    objetivo: inicial?.objetivo ?? objetivos[0] ?? '',
    local: inicial?.local ?? '',
    responsaveis: inicial?.responsaveis ?? '',
    dataInicio: inicial?.dataInicio ?? '',
    dataFim: inicial?.dataFim ?? '',
    valorSolicitado: inicial?.valorSolicitado ?? '',
    detalhe: inicial?.detalhe ?? '',
  });
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // Agenda de pagamento: à vista (1 parcela) ou parcelado (N).
  const parcelasInic = inicial?.parcelas ?? [];
  const [forma, setForma] = React.useState<'AVISTA' | 'PARCELADO'>(
    parcelasInic.length > 1 ? 'PARCELADO' : 'AVISTA',
  );
  const [dataAvista, setDataAvista] = React.useState(
    parcelasInic.length === 1 ? parcelasInic[0].data : '',
  );
  const [parcelas, setParcelas] = React.useState<{ valor: string; data: string }[]>(
    parcelasInic.length > 1
      ? parcelasInic.map((p) => ({ valor: p.valor, data: p.data }))
      : [{ valor: '', data: '' }, { valor: '', data: '' }],
  );

  function set<K extends keyof AcaoFormData>(k: K, v: AcaoFormData[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function irParcelado() {
    const valores = dividirValor(f.valorSolicitado, 2);
    setParcelas([
      { valor: valores[0] ?? '', data: parcelas[0]?.data ?? '' },
      { valor: valores[1] ?? '', data: parcelas[1]?.data ?? '' },
    ]);
    setForma('PARCELADO');
  }
  function mudarQtd(n: number) {
    const valores = dividirValor(f.valorSolicitado, n);
    setParcelas((prev) => Array.from({ length: n }, (_, i) => ({ valor: valores[i] ?? '', data: prev[i]?.data ?? '' })));
  }
  function setParcela(i: number, campo: 'valor' | 'data', v: string) {
    setParcelas((prev) => prev.map((p, j) => (j === i ? { ...p, [campo]: v } : p)));
  }
  const somaParcelas = parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const totalNum = f.valorSolicitado === '' ? 0 : Number(f.valorSolicitado);

  async function salvar() {
    setErro(null);
    if (!f.unidadeId) return setErro('Selecione a unidade.');
    if (!f.local.trim()) return setErro('Informe o local.');
    if (!f.dataInicio) return setErro('Informe a data de início.');

    let parcelasPayload: { valor: number; data: string }[] = [];
    if (totalNum > 0) {
      if (forma === 'AVISTA') {
        if (!dataAvista) return setErro('Informe a data de pagamento da ação.');
        parcelasPayload = [{ valor: totalNum, data: dataAvista }];
      } else {
        if (parcelas.some((p) => !p.data || !(Number(p.valor) > 0))) {
          return setErro('Preencha valor e data de todas as parcelas.');
        }
        if (Math.abs(somaParcelas - totalNum) > 0.01) {
          return setErro(
            `A soma das parcelas (R$ ${somaParcelas.toFixed(2)}) precisa bater com o valor solicitado (R$ ${totalNum.toFixed(2)}).`,
          );
        }
        parcelasPayload = parcelas.map((p) => ({ valor: Number(p.valor), data: p.data }));
      }
    }

    setBusy(true);
    const payload = {
      unidadeId: f.unidadeId,
      tipo: f.tipo,
      objetivo: f.objetivo,
      local: f.local,
      responsaveis: f.responsaveis,
      dataInicio: f.dataInicio,
      dataFim: f.dataFim || f.dataInicio,
      detalhe: f.detalhe,
      valorSolicitado: f.valorSolicitado === '' ? null : totalNum,
      parcelas: parcelasPayload,
    };
    const url = acaoId ? `/api/comercial/acoes/${acaoId}` : '/api/comercial/acoes';
    const method = acaoId ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acaoId ? { acao: 'editar', ...payload } : payload),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui salvar.');
      return;
    }
    toast(acaoId ? 'Ação atualizada' : 'Ação criada');
    if (onSaved) {
      onSaved();
      router.refresh();
      return;
    }
    router.push('/comercial/acoes');
    router.refresh();
  }

  const wrap = embedded ? '' : 'max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6';

  return (
    <div className={wrap}>
      {!embedded && (
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Planejamento da ação
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Unidade">
          <select value={f.unidadeId} onChange={(e) => set('unidadeId', e.target.value)} className={INP}>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de ação">
          <select value={f.tipo} onChange={(e) => set('tipo', e.target.value)} className={INP}>
            {tipos.map((t) => (
              <option key={t.id} value={t.nome}>
                {t.nome}
              </option>
            ))}
          </select>
          <Link href="/comercial/tipos" className="mt-1 inline-block text-xs font-semibold text-primary">
            ＋ criar um tipo novo
          </Link>
        </Field>
        <Field label="Objetivo (por quê)">
          <select value={f.objetivo} onChange={(e) => set('objetivo', e.target.value)} className={INP}>
            {objetivos.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Local (onde)">
          <input value={f.local} onChange={(e) => set('local', e.target.value)} placeholder="Ex: Hospital Dório Silva" className={INP} />
        </Field>
        <Field label="Responsáveis (quem)">
          <input value={f.responsaveis} onChange={(e) => set('responsaveis', e.target.value)} placeholder="Ex: Mariana, Regina" className={INP} />
        </Field>
        <Field label="Valor solicitado (R$)">
          <input type="number" inputMode="decimal" value={f.valorSolicitado} onChange={(e) => set('valorSolicitado', e.target.value)} placeholder="0,00" className={INP} />
        </Field>
        <Field label="Data de início">
          <input type="date" value={f.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} className={INP} />
        </Field>
        <Field label="Data de fim">
          <input type="date" value={f.dataFim} onChange={(e) => set('dataFim', e.target.value)} className={INP} />
          <span className="mt-1 text-xs text-muted-foreground">Deixe vazio se for 1 dia só.</span>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Detalhe da ação / planejamento completo (como)">
            <textarea
              value={f.detalhe}
              onChange={(e) => set('detalhe', e.target.value)}
              rows={4}
              placeholder="Materiais necessários, pessoas envolvidas, organização, reuniões prévias, logística, horários..."
              className={INP}
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pagamento da ação</p>
        {totalNum <= 0 ? (
          <p className="text-xs text-muted-foreground">
            Informe o <b>valor solicitado</b> acima para definir como o repasse será pago.
          </p>
        ) : (
          <>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setForma('AVISTA')}
                className={forma === 'AVISTA' ? 'rounded-md bg-primary px-3 py-1 text-primary-foreground' : 'rounded-md px-3 py-1 text-muted-foreground'}
              >
                À vista
              </button>
              <button
                type="button"
                onClick={irParcelado}
                className={forma === 'PARCELADO' ? 'rounded-md bg-primary px-3 py-1 text-primary-foreground' : 'rounded-md px-3 py-1 text-muted-foreground'}
              >
                Parcelado
              </button>
            </div>

            {forma === 'AVISTA' ? (
              <div className="mt-3 max-w-xs">
                <Field label="Data de pagamento">
                  <input type="date" value={dataAvista} onChange={(e) => setDataAvista(e.target.value)} className={INP} />
                </Field>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nº de parcelas
                  <select
                    value={parcelas.length}
                    onChange={(e) => mudarQtd(Number(e.target.value))}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-semibold"
                  >
                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </label>
                {parcelas.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={p.valor}
                      onChange={(e) => setParcela(i, 'valor', e.target.value)}
                      placeholder={`Parcela ${i + 1} (R$)`}
                      className={INP}
                    />
                    <input type="date" value={p.data} onChange={(e) => setParcela(i, 'data', e.target.value)} className={INP} />
                  </div>
                ))}
                <p className={`text-xs font-semibold ${Math.abs(somaParcelas - totalNum) > 0.01 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Soma R$ {somaParcelas.toFixed(2)} / Solicitado R$ {totalNum.toFixed(2)}
                  {Math.abs(somaParcelas - totalNum) > 0.01 && ' — precisa bater'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}

      <div className="mt-5 flex gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={salvar}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {acaoId ? 'Salvar alterações' : 'Salvar ação'}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
        ) : (
          <Link href="/comercial/acoes" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            Cancelar
          </Link>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col">
      <span className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
