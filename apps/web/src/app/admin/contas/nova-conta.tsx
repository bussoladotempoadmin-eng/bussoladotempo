'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/toast';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

// Cria (ou atualiza) a assinatura de um usuário existente, por e-mail.
export function NovaContaButton({ planos }: { planos: { slug: string; nome: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [aberto, setAberto] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [planoSlug, setPlanoSlug] = React.useState(planos[0]?.slug ?? '');
  const [assentos, setAssentos] = React.useState('1');
  const [status, setStatus] = React.useState<'TRIAL' | 'ATIVA'>('TRIAL');
  const [diasTrial, setDiasTrial] = React.useState('14');

  async function salvar() {
    if (!email.trim()) return toast('Informe o e-mail.', 'erro');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/contas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          planoSlug,
          assentos: Number(assentos) || 1,
          status,
          diasTrial: Number(diasTrial) || 14,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Não foi possível criar a conta.', 'erro');
        return;
      }
      toast('Conta criada/atualizada.', 'sucesso');
      setAberto(false);
      setEmail('');
      if (data.assinaturaId) router.push(`/admin/contas/${data.assinaturaId}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Nova conta
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setAberto(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold">Atribuir plano a um usuário</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          O usuário já precisa ter conta (e-mail cadastrado). Isso cria/atualiza a assinatura dele.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">E-mail</label>
            <input type="email" className={INP} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Plano</label>
              <select className={INP} value={planoSlug} onChange={(e) => setPlanoSlug(e.target.value)}>
                {planos.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Assentos</label>
              <input type="number" min={1} className={INP} value={assentos} onChange={(e) => setAssentos(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Status</label>
              <select className={INP} value={status} onChange={(e) => setStatus(e.target.value as 'TRIAL' | 'ATIVA')}>
                <option value="TRIAL">Trial</option>
                <option value="ATIVA">Ativa</option>
              </select>
            </div>
            {status === 'TRIAL' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Dias de trial</label>
                <input type="number" min={1} className={INP} value={diasTrial} onChange={(e) => setDiasTrial(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setAberto(false)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            Cancelar
          </button>
          <button onClick={salvar} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
