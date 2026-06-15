'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play } from 'lucide-react';
import { useToast } from '@/components/toast';

// Dispara a máquina de estados de billing sob demanda (pra testar sem esperar o cron).
export function RodarBilling() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function rodar() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/jobs/billing', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast(
        `Billing rodou: ${data.avaliadas} contas · ${data.emails} e-mails · ${data.transicoes} transições · ${data.cobrancasGeradas} cobranças.`,
        'sucesso',
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={rodar}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      Rodar billing agora
    </button>
  );
}
