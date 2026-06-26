'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building, Plus, Check, Loader2, X } from 'lucide-react';
import type { EmpresaInfo } from '@/lib/comercial';
import { useToast } from '@/components/toast';

export function EmpresaSelector({
  empresas,
  atualId,
  podeCriar = false,
}: {
  empresas: EmpresaInfo[];
  atualId: string;
  podeCriar?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [criando, setCriando] = React.useState(false);
  const [nome, setNome] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const atual = empresas.find((e) => e.id === atualId);

  async function trocar(orgId: string) {
    if (orgId === atualId) return setOpen(false);
    setBusy(true);
    await fetch('/api/comercial/empresa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    setOpen(false);
    setBusy(false);
    router.push('/comercial');
    router.refresh();
  }

  async function criar() {
    if (!nome.trim()) return;
    setBusy(true);
    await fetch('/api/comercial/empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    setNome('');
    setCriando(false);
    setOpen(false);
    setBusy(false);
    toast('Empresa criada');
    router.push('/comercial');
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-bold"
      >
        <Building className="h-4 w-4 text-primary" />
        <span className="max-w-[160px] truncate">{atual?.nome ?? 'Empresa'}</span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Suas empresas
            </p>
            {empresas.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => trocar(e.id)}
                disabled={busy}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">
                  {e.nome}
                  {!e.ehDono && <span className="ml-1 text-xs text-muted-foreground">(coord.)</span>}
                </span>
                {e.id === atualId && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}

            {podeCriar && (criando ? (
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-1.5">
                  <input
                    value={nome}
                    autoFocus
                    onChange={(e) => setNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && criar()}
                    placeholder="Nome da empresa"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                  />
                  <button type="button" onClick={criar} disabled={busy} className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setCriando(false)} className="rounded-lg border border-border p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCriando(true)}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                Nova empresa
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
