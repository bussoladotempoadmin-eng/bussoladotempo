'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Users, Briefcase } from 'lucide-react';
import { useToast } from '@/components/toast';

type PlanoView = {
  slug: string;
  nome: string;
  precoMensal: number;
  precoPorAssento: number;
  moduloTimeAtivo: boolean;
  moduloComercialAtivo: boolean;
  precoLabel: string;
};

export function EscolherPlano({
  planos,
  planoAtualSlug,
  assentosAtuais,
}: {
  planos: PlanoView[];
  planoAtualSlug: string;
  assentosAtuais: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [assentos, setAssentos] = React.useState(String(Math.max(1, assentosAtuais)));

  async function escolher(slug: string, porAssento: boolean) {
    setBusy(slug);
    try {
      const res = await fetch('/api/meu-plano', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planoSlug: slug, assentos: porAssento ? Number(assentos) || 1 : 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Não foi possível registrar a escolha.', 'erro');
        return;
      }
      toast('Plano escolhido! Vamos combinar a ativação com você.', 'sucesso');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {planos.map((p) => {
        const atual = p.slug === planoAtualSlug;
        const porAssento = p.precoPorAssento > 0;
        return (
          <div
            key={p.slug}
            className={`flex flex-col rounded-2xl border p-5 ${atual ? 'border-primary ring-1 ring-primary' : 'border-border'} bg-card`}
          >
            <div className="text-lg font-bold">{p.nome}</div>
            <div className="mt-1 text-sm text-muted-foreground">{p.precoLabel}</div>

            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" /> Agenda com IA + todas as funções
              </li>
              {p.moduloTimeAtivo && (
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Módulo de Time
                </li>
              )}
              {p.moduloComercialAtivo && (
                <li className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Módulo Comercial
                </li>
              )}
            </ul>

            {porAssento && (
              <label className="mt-4 block text-xs text-muted-foreground">
                Quantos acessos?
                <input
                  type="number"
                  min={1}
                  value={assentos}
                  onChange={(e) => setAssentos(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            )}

            <button
              onClick={() => escolher(p.slug, porAssento)}
              disabled={busy !== null || atual}
              className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                atual ? 'border border-border text-muted-foreground' : 'bg-primary text-primary-foreground'
              }`}
            >
              {busy === p.slug && <Loader2 className="h-4 w-4 animate-spin" />}
              {atual ? 'Plano atual' : 'Quero este plano'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
