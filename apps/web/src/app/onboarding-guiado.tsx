'use client';

import * as React from 'react';
import { X } from 'lucide-react';

/**
 * Tour guiado ancorado (spotlight). Para cada passo, ilumina o elemento real
 * (via data-tour) com um balão. Se o alvo não existir/estiver invisível na tela
 * (ex.: barra de baixo no desktop), o passo vira um card centralizado.
 *
 * Reversível: o home decide se renderiza este, o de cards, ou nenhum (TOUR_MODO).
 */

type Passo = { target?: string; titulo: string; texto: string };

const PASSOS: Passo[] = [
  { titulo: 'Bem-vindo à Bússola 🧭', texto: 'Em 30 segundos te mostro onde fica cada coisa. Pode pular quando quiser.' },
  { target: '[data-tour="menu"]', titulo: 'Suas seções', texto: 'No seu nome ficam Frentes, Time, Meu Plano e configurações.' },
  { target: '[data-tour="nav-semana"]', titulo: 'Sua semana', texto: 'É onde você monta a semana com a IA e ajusta seus blocos.' },
  { target: '[data-tour="nav-revisao"]', titulo: 'Revisão', texto: 'De sexta a domingo, revise como foi e já planeje a próxima.' },
  { titulo: 'Conclua suas demandas ✅', texto: 'Ao terminar um bloco, toque em “Concluir”: diga quando foi e se saiu como planejado, virou urgente ou foi disperso.' },
  { titulo: 'Pronto pra começar 🚀', texto: 'Bom proveito! Você pode rever isso quando quiser.' },
];

const PAD = 8;

export function OnboardingGuiado() {
  const [i, setI] = React.useState(0);
  const [fechado, setFechado] = React.useState(false);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [montado, setMontado] = React.useState(false);

  React.useEffect(() => setMontado(true), []);

  const popRef = React.useRef<HTMLDivElement>(null);
  const passo = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;

  // Mede o alvo do passo atual (ou null = vira card centralizado).
  const medir = React.useCallback(() => {
    if (!passo.target) return setRect(null);
    const el = document.querySelector(passo.target) as HTMLElement | null;
    if (!el || el.offsetParent === null) return setRect(null);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return setRect(null);
    setRect(r);
  }, [passo]);

  // Ao trocar de passo: rola o alvo pra vista e mede.
  React.useEffect(() => {
    if (passo.target) {
      const el = document.querySelector(passo.target) as HTMLElement | null;
      if (el && el.offsetParent !== null) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const t = setTimeout(medir, 80);
    return () => clearTimeout(t);
  }, [i, passo, medir]);

  // Reposiciona em scroll/resize.
  React.useEffect(() => {
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [medir]);

  // Posiciona o balão (imperativo) sempre que muda o alvo.
  React.useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      // centralizado
      pop.style.left = Math.round((vw - pw) / 2) + 'px';
      pop.style.top = Math.round((vh - ph) / 2) + 'px';
      return;
    }
    const espacoAbaixo = vh - rect.bottom;
    let top: number;
    if (espacoAbaixo > ph + 24) top = rect.bottom + 14;
    else top = Math.max(12, rect.top - ph - 14);
    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(12, Math.min(left, vw - pw - 12));
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }, [rect, i]);

  async function fim() {
    setFechado(true);
    try {
      await fetch('/api/conta/onboarding', { method: 'POST' });
    } catch {
      /* ignora */
    }
  }

  if (fechado || !montado) return null;

  return (
    <>
      {/* fundo escuro: buraco (spotlight) quando há alvo; tela cheia quando é card */}
      {rect ? (
        <div
          className="pointer-events-none fixed z-[60] rounded-xl border-2 border-primary transition-all duration-300"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(2,6,23,.72)',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[60] bg-black/65" />
      )}

      {/* balão */}
      <div
        ref={popRef}
        className="fixed z-[61] w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-5 shadow-2xl transition-all duration-300"
      >
        <div className="mb-2 flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
            Passo {i + 1} de {PASSOS.length}
          </span>
          <button onClick={fim} aria-label="Pular" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Pular <X className="inline h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="text-lg font-bold">{passo.titulo}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{passo.texto}</p>

        <div className="mt-4 flex items-center gap-1.5">
          {PASSOS.map((_, idx) => (
            <span key={idx} className={`h-1.5 flex-1 rounded-full ${idx <= i ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-1">
          {i > 0 && (
            <button
              onClick={() => setI((v) => Math.max(0, v - 1))}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => (ultimo ? fim() : setI((v) => Math.min(PASSOS.length - 1, v + 1)))}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {ultimo ? 'Começar 🚀' : 'Avançar'}
          </button>
        </div>
      </div>
    </>
  );
}
