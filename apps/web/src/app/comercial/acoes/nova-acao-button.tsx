'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { AcaoForm } from './acao-form';

type Opt = { id: string; nome: string };

export function NovaAcaoButton({
  unidades,
  tipos,
  objetivos,
}: {
  unidades: Opt[];
  tipos: Opt[];
  objetivos: readonly string[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        Nova ação
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nova ação"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Nova ação comercial</h3>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AcaoForm
              unidades={unidades}
              tipos={tipos}
              objetivos={objetivos}
              embedded
              onCancel={() => setAberto(false)}
              onSaved={() => {
                setAberto(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
