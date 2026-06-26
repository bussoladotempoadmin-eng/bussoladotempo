'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast';

export function ExcluirAcaoButton({ acaoId, local }: { acaoId: string; local: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function excluir() {
    if (!window.confirm(`Excluir a ação "${local}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    const res = await fetch(`/api/comercial/acoes/${acaoId}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Não consegui excluir.', 'erro');
      return;
    }
    toast('Ação excluída.');
    router.push('/comercial/acoes');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Excluir ação
    </button>
  );
}
