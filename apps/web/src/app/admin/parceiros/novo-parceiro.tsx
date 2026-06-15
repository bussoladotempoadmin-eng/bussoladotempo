'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/toast';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

export function NovoParceiroButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [aberto, setAberto] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [rate, setRate] = React.useState('20');
  const [pix, setPix] = React.useState('');

  async function salvar() {
    if (!nome.trim()) return toast('Informe o nome.', 'erro');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/parceiros', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), comissaoRate: Number(rate) || 0, pixChave: pix.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast('Parceiro criado.', 'sucesso');
      setAberto(false);
      if (data.id) router.push(`/admin/parceiros/${data.id}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
        <Plus className="h-4 w-4" /> Novo parceiro
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setAberto(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">Novo parceiro</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nome</label>
            <input className={INP} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do parceiro/agência" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">E-mail (opcional)</label>
            <input className={INP} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parceiro@email.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Comissão (%)</label>
              <input type="number" min={0} className={INP} value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Chave PIX (payout)</label>
              <input className={INP} value={pix} onChange={(e) => setPix(e.target.value)} placeholder="CPF/e-mail/chave" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setAberto(false)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            Cancelar
          </button>
          <button onClick={salvar} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar
          </button>
        </div>
      </div>
    </div>
  );
}
