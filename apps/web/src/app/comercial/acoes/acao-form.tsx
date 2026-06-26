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
};

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

  function set<K extends keyof AcaoFormData>(k: K, v: AcaoFormData[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function salvar() {
    setErro(null);
    if (!f.unidadeId) return setErro('Selecione a unidade.');
    if (!f.local.trim()) return setErro('Informe o local.');
    if (!f.dataInicio) return setErro('Informe a data de início.');
    setBusy(true);
    const payload = {
      ...f,
      dataFim: f.dataFim || f.dataInicio,
      valorSolicitado: f.valorSolicitado === '' ? null : Number(f.valorSolicitado),
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
