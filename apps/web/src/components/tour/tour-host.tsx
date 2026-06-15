'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { onTour } from './tour-bus';
import { passosParaRota, type Passo } from '@/lib/tour-passos';
import { TourSpotlight } from './tour-spotlight';

/**
 * Host global do tour (fica no layout). Escuta abrirTour() e mostra o tour da
 * rota atual (ou da rota informada). Usado pelos botões "Rever tour" / "?".
 */
export function TourHost() {
  const pathname = usePathname();
  const [steps, setSteps] = React.useState<Passo[] | null>(null);

  React.useEffect(
    () =>
      onTour((rota) => {
        const p = passosParaRota(rota ?? pathname);
        if (p && p.length) setSteps(p);
      }),
    [pathname],
  );

  if (!steps) return null;
  // key força recomeçar do passo 1 a cada abertura
  return <TourSpotlight key={steps.length + (steps[0]?.titulo ?? '')} steps={steps} onClose={() => setSteps(null)} />;
}
