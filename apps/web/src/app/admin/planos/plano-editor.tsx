'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast';

const INP = 'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary';

export function PlanoEditor({
  slug,
  inicial,
}: {
  slug: string;
  inicial: { precoMensal: number; precoAnual: number; precoPorAssento: number; geracoesIaMes: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [m, setM] = React.useState(inicial.precoMensal.toFixed(2));
  const [a, setA] = React.useState(inicial.precoAnual.toFixed(2));
  const [s, setS] = React.useState(inicial.precoPorAssento.toFixed(2));
  const [ia, setIa] = React.useState(String(inicial.geracoesIaMes));

  async function salvar() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/planos/${slug}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          precoMensal: Number(m),
          precoAnual: Number(a),
          precoPorAssento: Number(s),
          geracoesIaMes: Number(ia),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast('Plano atualizado.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-muted-foreground">Mensal</span>
          <input type="number" step="0.01" min={0} className={INP} value={m} onChange={(e) => setM(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-muted-foreground">Anual</span>
          <input type="number" step="0.01" min={0} className={INP} value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-muted-foreground">Por assento</span>
          <input type="number" step="0.01" min={0} className={INP} value={s} onChange={(e) => setS(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-muted-foreground">Gerações IA/mês</span>
          <input type="number" min={0} className={INP} value={ia} onChange={(e) => setIa(e.target.value)} />
        </label>
      </div>
      <button
        onClick={salvar}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar preços
      </button>
    </div>
  );
}
