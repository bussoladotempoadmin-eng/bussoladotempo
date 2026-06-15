'use client';

import * as React from 'react';
import { X } from 'lucide-react';

type Passo = { emoji: string; titulo: string; texto: string };

const PASSOS: Passo[] = [
  {
    emoji: '🧭',
    titulo: 'Bem-vindo à Bússola do Tempo',
    texto: 'Em 1 minuto te mostro como tudo funciona. Pode pular se preferir explorar sozinho.',
  },
  {
    emoji: '🎯',
    titulo: 'Suas Frentes',
    texto: 'Frentes são as áreas que você toca (trabalho, negócio, estudos…). Tudo na sua semana é organizado por elas.',
  },
  {
    emoji: '📌',
    titulo: 'Compromissos fixos',
    texto: 'Cadastre o que se repete toda semana (treino, reuniões, lives). Eles entram automaticamente na sua agenda.',
  },
  {
    emoji: '✨',
    titulo: 'Monte a semana com IA',
    texto: 'A IA monta sua semana a partir das suas frentes e do que já funcionou pra você. Você ajusta o que quiser.',
  },
  {
    emoji: '✅',
    titulo: 'Conclua e diga como foi',
    texto: 'Ao terminar uma demanda, marque "Concluir": diga quando foi e se saiu como planejado, virou urgente ou foi disperso. É o que dá inteligência ao sistema.',
  },
  {
    emoji: '🔄',
    titulo: 'Revise toda semana',
    texto: 'De sexta a domingo, faça a revisão: veja como foi e já planeje a próxima. Esse ritual é o segredo de não largar.',
  },
];

export function OnboardingTour() {
  const [i, setI] = React.useState(0);
  const [fechado, setFechado] = React.useState(false);

  async function marcarVisto() {
    setFechado(true);
    try {
      await fetch('/api/conta/onboarding', { method: 'POST' });
    } catch {
      /* ignora — pior caso, aparece de novo */
    }
  }

  if (fechado) return null;
  const passo = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="text-4xl">{passo.emoji}</div>
          <button
            onClick={marcarVisto}
            aria-label="Pular"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Pular <X className="inline h-3.5 w-3.5" />
          </button>
        </div>

        <h2 className="text-xl font-bold">{passo.titulo}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{passo.texto}</p>

        {/* Progresso */}
        <div className="mt-5 flex items-center gap-1.5">
          {PASSOS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 flex-1 rounded-full ${idx <= i ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-0"
          >
            Voltar
          </button>
          {ultimo ? (
            <button
              onClick={marcarVisto}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Começar 🚀
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(PASSOS.length - 1, v + 1))}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Avançar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
