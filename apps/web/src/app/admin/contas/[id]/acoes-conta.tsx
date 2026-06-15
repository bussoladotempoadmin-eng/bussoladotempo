'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast';
import type { StatusAssinatura, CicloPlano } from '@bussola/db';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';
const STATUSES: StatusAssinatura[] = ['TRIAL', 'ATIVA', 'ATRASADA', 'SUSPENSA', 'CANCELADA'];
const STATUS_LBL: Record<StatusAssinatura, string> = {
  TRIAL: 'Trial',
  ATIVA: 'Ativa',
  ATRASADA: 'Atrasada',
  SUSPENSA: 'Suspensa',
  CANCELADA: 'Cancelada',
};

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 text-sm font-semibold">{titulo}</div>
      {children}
    </div>
  );
}

export function AcoesConta(props: {
  assinaturaId: string;
  status: StatusAssinatura;
  planoSlug: string;
  assentos: number;
  ciclo: CicloPlano;
  notasInternas: string;
  valorSugerido: number;
  planos: { slug: string; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  // edição da assinatura
  const [status, setStatus] = React.useState(props.status);
  const [planoSlug, setPlanoSlug] = React.useState(props.planoSlug);
  const [assentos, setAssentos] = React.useState(String(props.assentos));
  const [ciclo, setCiclo] = React.useState(props.ciclo);
  const [notas, setNotas] = React.useState(props.notasInternas);

  // trial
  const [dias, setDias] = React.useState('14');

  // cobrança
  const [valor, setValor] = React.useState(props.valorSugerido.toFixed(2));
  const [desconto, setDesconto] = React.useState('0');
  const [venc, setVenc] = React.useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [nota, setNota] = React.useState('');

  async function call(tag: string, url: string, method: string, body: unknown) {
    setBusy(tag);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card titulo="Assinatura">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Status</span>
              <select className={INP} value={status} onChange={(e) => setStatus(e.target.value as StatusAssinatura)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LBL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Ciclo</span>
              <select className={INP} value={ciclo} onChange={(e) => setCiclo(e.target.value as CicloPlano)}>
                <option value="MENSAL">Mensal</option>
                <option value="ANUAL">Anual</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Plano</span>
              <select className={INP} value={planoSlug} onChange={(e) => setPlanoSlug(e.target.value)}>
                {props.planos.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Assentos</span>
              <input type="number" min={1} className={INP} value={assentos} onChange={(e) => setAssentos(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Notas internas</span>
            <textarea className={INP} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </label>
          <button
            onClick={() =>
              call('edit', `/api/admin/contas/${props.assinaturaId}`, 'PATCH', {
                status,
                planoSlug,
                assentos: Number(assentos) || 1,
                ciclo,
                notasInternas: notas,
              }).then((ok) => ok && toast('Assinatura atualizada.'))
            }
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === 'edit' && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </Card>

      <Card titulo="Trial">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Estender trial por (dias, a partir de hoje)</span>
            <input type="number" min={1} className={INP} value={dias} onChange={(e) => setDias(e.target.value)} />
          </label>
          <button
            onClick={() =>
              call('trial', `/api/admin/contas/${props.assinaturaId}`, 'POST', {
                tipo: 'estender_trial',
                dias: Number(dias) || 14,
              }).then((ok) => ok && toast('Trial estendido.'))
            }
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            {busy === 'trial' && <Loader2 className="h-4 w-4 animate-spin" />} Estender
          </button>
        </div>
      </Card>

      <Card titulo="Nova cobrança (manual)">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Valor (R$)</span>
              <input type="number" step="0.01" min={0} className={INP} value={valor} onChange={(e) => setValor(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Desconto (R$)</span>
              <input type="number" step="0.01" min={0} className={INP} value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Vencimento</span>
            <input type="date" className={INP} value={venc} onChange={(e) => setVenc(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Observação (opcional)</span>
            <input type="text" className={INP} value={nota} onChange={(e) => setNota(e.target.value)} />
          </label>
          <button
            onClick={() =>
              call('cob', `/api/admin/contas/${props.assinaturaId}`, 'POST', {
                tipo: 'criar_cobranca',
                valor: Number(valor) || undefined,
                descontoValor: Number(desconto) || 0,
                vencimento: venc,
                nota: nota || undefined,
              }).then((ok) => ok && toast('Cobrança criada.'))
            }
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === 'cob' && <Loader2 className="h-4 w-4 animate-spin" />} Gerar cobrança
          </button>
        </div>
      </Card>
    </div>
  );
}

// Ações por linha de cobrança (marcar paga / cancelar).
export function CobrancaAcoes({ cobrancaId, status }: { cobrancaId: string; status: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function marcar(novo: 'PAGA' | 'CANCELADA') {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cobrancas/${cobrancaId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast(novo === 'PAGA' ? 'Marcada como paga.' : 'Cobrança cancelada.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === 'PAGA' || status === 'CANCELADA') return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => marcar('PAGA')}
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
      >
        Marcar paga
      </button>
      <button
        onClick={() => marcar('CANCELADA')}
        disabled={busy}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
      >
        Cancelar
      </button>
    </div>
  );
}
