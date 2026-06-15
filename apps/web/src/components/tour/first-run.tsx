'use client';

import * as React from 'react';
import { TOUR_MODO, PASSOS_HOME } from '@/lib/tour-passos';
import { TourSpotlight } from './tour-spotlight';
import { OnboardingTour } from '@/app/onboarding-tour';

/**
 * Primeira vez: mostra o tour da Home pra quem ainda não viu (onboardingVisto).
 * O home só renderiza este componente quando !onboardingVisto.
 * Respeita TOUR_MODO: guiado (spotlight) | cards | off.
 */
export function FirstRun() {
  const [fechado, setFechado] = React.useState(false);

  async function marcarVisto() {
    setFechado(true);
    try {
      await fetch('/api/conta/onboarding', { method: 'POST' });
    } catch {
      /* ignora */
    }
  }

  if (fechado || TOUR_MODO === 'off') return null;
  if (TOUR_MODO === 'cards') return <OnboardingTour />; // já marca visto internamente
  return <TourSpotlight steps={PASSOS_HOME} onClose={marcarVisto} />;
}
