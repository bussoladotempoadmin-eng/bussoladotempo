'use client';

import * as React from 'react';
import Link from 'next/link';
import { Compass, X } from 'lucide-react';

/**
 * Aviso de onboarding pra quem "entrou direto" e ainda não escolheu plano.
 * Aparece uma vez por sessão (pode fechar). Some de vez quando a pessoa
 * escolhe um plano (aí o servidor não renderiza mais este componente).
 */
export function AvisoPlano({ planoNome, diasRestantes }: { planoNome: string; diasRestantes: number | null }) {
  const [aberto, setAberto] = React.useState(false);

  React.useEffect(() => {
    // Mostra uma vez por sessão do navegador.
    const jaViu = sessionStorage.getItem('aviso-plano-visto');
    if (!jaViu) setAberto(true);
  }, []);

  function fechar() {
    sessionStorage.setItem('aviso-plano-visto', '1');
    setAberto(false);
  }

  if (!aberto) {
    // Faixa discreta e persistente (não some até escolher o plano).
    return (
      <div className="container">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">
            Você está no <b className="text-foreground">{planoNome}</b> (teste grátis
            {diasRestantes != null ? ` · ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'} restantes` : ''}).
          </span>
          <Link href="/meu-plano" className="font-semibold text-primary hover:underline">
            Escolher meu plano →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={fechar}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Compass className="h-6 w-6 text-primary" />
            Bem-vindo à Bússola!
          </div>
          <button onClick={fechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Você entrou no <b className="text-foreground">{planoNome}</b> com um{' '}
            <b className="text-foreground">teste grátis de 14 dias</b>
            {diasRestantes != null ? ` (faltam ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'})` : ''}. Pode usar tudo à
            vontade nesse período.
          </p>
          <p>
            Pra continuar depois do teste e escolher o plano ideal pra você, é só ir em{' '}
            <b className="text-foreground">Meu Plano</b>. Qualquer dúvida, a gente te ajuda a escolher.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={fechar} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            Agora não
          </button>
          <Link
            href="/meu-plano"
            onClick={fechar}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
