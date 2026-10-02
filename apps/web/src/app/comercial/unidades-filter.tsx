'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Check, ChevronDown } from 'lucide-react';

/**
 * Seletor multi-unidade. Vazio = todas. Sem `onChange`, atualiza a URL do Painel
 * (?unidades=id1,id2) preservando os outros filtros (de/ate) — selecionar todas
 * remove o parâmetro. Com `onChange`, é controlado pelo pai (ex.: calendário).
 * `cores` (opcional) mostra a bolinha de cor de cada unidade.
 */
export function UnidadesFilter({
  unidades,
  selecionadas,
  onChange,
  cores,
}: {
  unidades: { id: string; nome: string }[];
  selecionadas: string[];
  onChange?: (ids: string[]) => void;
  cores?: Map<string, string>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const sel = new Set(selecionadas);
  const todas = sel.size === 0 || sel.size === unidades.length;

  function aplicar(nova: Set<string>) {
    if (onChange) {
      onChange(nova.size === unidades.length ? [] : Array.from(nova));
      return;
    }
    const params = new URLSearchParams(sp.toString());
    if (nova.size === 0 || nova.size === unidades.length) params.delete('unidades');
    else params.set('unidades', Array.from(nova).join(','));
    startTransition(() => router.push(`/comercial?${params.toString()}`));
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
        className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold transition-opacity ${pending ? 'opacity-60' : ''}`}
      >
        <Building2 className="h-4 w-4 text-primary" />
        <span className="max-w-[160px] truncate">{rotulo}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground ${pending ? 'animate-pulse' : ''}`} />
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
                  <span className="flex min-w-0 items-center gap-2">
                    {cores?.has(u.id) && (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: cores.get(u.id) }} />
                    )}
                    <span className="truncate">{u.nome}</span>
                  </span>
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
