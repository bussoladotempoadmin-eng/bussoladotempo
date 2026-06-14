'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2 } from 'lucide-react';

export function AtivarComercial() {
  const router = useRouter();
  const [nome, setNome] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function ativar() {
    setBusy(true);
    const r = await fetch('/api/comercial/empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    if (r.ok) {
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-7 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Briefcase className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight">Bússola Comercial</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        O quadro do seu setor comercial: cadastre unidades (cidades), planeje ações de captação,
        controle a verba (solicitado × gasto) e veja tudo consolidado num painel. É um módulo
        separado da agenda pessoal.
      </p>

      <div className="mt-6 text-left">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Nome da empresa / rede
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Doctum Comercial"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={ativar}
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
        Ativar módulo Comercial
      </button>
      <p className="mt-3 text-xs text-muted-foreground">
        Você vira o diretor da operação. Depois é só adicionar unidades e seu time.
      </p>
    </div>
  );
}
