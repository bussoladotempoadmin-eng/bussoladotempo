'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Check, ChevronDown } from 'lucide-react';

/**
 * Seletor multi-unidade do Painel. Vazio = todas. Atualiza a URL (?unidades=id1,id2)
 * preservando os outros filtros (de/ate). Selecionar todas remove o parâmetro.
 */
export function UnidadesFilter({
  unidades,
  selecionadas,
}: {
  unidades: { id: string; nome: string }[];
  selecionadas: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const sel = new Set(selecionadas);
  const todas = sel.size === 0 || sel.size === unidades.length;

  function aplicar(nova: Set<string>) {
    const params = new URLSearchParams(sp.toString());
    if (nova.size === 0 || nova.size === unidades.length) params.delete('unidades');
    else params.set('unidades', Array.from(nova).join(','));
    router.push(`/comercial?${params.toString()}`);
  }

  function toggle(id: string) {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    aplicar(n);
  }

  const rotulo = todas
    ? 'Todas as unidades'
    : sel.size === 1
      ? unidades.find((u) => sel.has(u.id))?.nome ?? '1 unidade'
      : `${sel.size} unidades`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold"
      >
        <Building2 className="h-4 w-4 text-primary" />
        <span className="max-w-[160px] truncate">{rotulo}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 z-20 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
            <button
              type="button"
              onClick={() => aplicar(new Set())}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted"
            >
              <span className="font-semibold">Todas as unidades</span>
              {todas && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
            <div className="border-t border-border" />
            {unidades.map((u) => {
              const on = !todas && sel.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{u.nome}</span>
                  {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
