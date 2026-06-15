/**
 * Mini pub/sub do tour: qualquer botão chama abrirTour(); o TourHost (global)
 * escuta e abre o tour da tela atual (ou da rota informada).
 */
type Cb = (rota?: string) => void;

let ouvinte: Cb | null = null;

export function onTour(cb: Cb): () => void {
  ouvinte = cb;
  return () => {
    if (ouvinte === cb) ouvinte = null;
  };
}

export function abrirTour(rota?: string): void {
  ouvinte?.(rota);
}
