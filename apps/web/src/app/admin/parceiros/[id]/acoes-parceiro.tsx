'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export function ParceiroAcoes(props: {
  id: string;
  nome: string;
  email: string;
  comissaoRate: number;
  pixChave: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [nome, setNome] = React.useState(props.nome);
  const [email, setEmail] = React.useState(props.email);
  const [rate, setRate] = React.useState(String(props.comissaoRate));
  const [pix, setPix] = React.useState(props.pixChave);
  const [ativo, setAtivo] = React.useState(props.ativo);

  async function salvar(patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/parceiros/${props.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast('Parceiro atualizado.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 text-sm font-semibold">Dados do parceiro</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Nome</span>
          <input className={INP} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">E-mail</span>
          <input className={INP} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Comissão (%)</span>
          <input type="number" min={0} className={INP} value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Chave PIX</span>
          <input className={INP} value={pix} onChange={(e) => setPix(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => salvar({ nome, email, comissaoRate: Number(rate) || 0, pixChave: pix })}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
        <button
          onClick={() => {
            setAtivo(!ativo);
            salvar({ ativo: !ativo });
          }}
          disabled={busy}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          {ativo ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    </div>
  );
}

export function ComissoesPagar({ ids, pix }: { ids: string[]; pix: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function pagar() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/comissoes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast(`${data.pagas ?? 0} comissão(ões) marcada(s) como paga(s).`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {ids.length} comissão(ões){pix ? ` · PIX: ${pix}` : ''}
      </p>
      <button
        onClick={pagar}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Marcar tudo como pago
      </button>
    </div>
  );
}
