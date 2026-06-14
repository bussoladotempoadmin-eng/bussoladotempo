'use client';

import * as React from 'react';
import { Users, Loader2, Plus, Trash2, Crown } from 'lucide-react';
import type { TimeGestor, MembroInfo } from '@/lib/equipe';

export function TimeView({ inicial }: { inicial: TimeGestor | null }) {
  const [org, setOrg] = React.useState(inicial?.org ?? null);
  const [membros, setMembros] = React.useState<MembroInfo[]>(inicial?.membros ?? []);

  const [nome, setNome] = React.useState('');
  const [criando, setCriando] = React.useState(false);

  const [email, setEmail] = React.useState('');
  const [addBusy, setAddBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [removendo, setRemovendo] = React.useState<string | null>(null);

  async function recarregar() {
    const r = await fetch('/api/equipe');
    if (r.ok) {
      const d: { org: { id: string; nome: string } | null; membros: MembroInfo[] } = await r.json();
      setOrg(d.org);
      setMembros(d.membros ?? []);
    }
  }

  async function criarTime() {
    setCriando(true);
    const r = await fetch('/api/equipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    setCriando(false);
    if (r.ok) {
      const d = await r.json();
      setOrg(d.org);
    }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAddBusy(true);
    const r = await fetch('/api/equipe/membros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setAddBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui adicionar.');
      return;
    }
    setEmail('');
    await recarregar();
  }

  async function remover(membroId: string) {
    if (!window.confirm('Remover esta pessoa do time?')) return;
    setRemovendo(membroId);
    await fetch(`/api/equipe/membros?id=${membroId}`, { method: 'DELETE' });
    setRemovendo(null);
    setMembros((prev) => prev.filter((m) => m.membroId !== membroId));
  }

  // Ainda não tem time → criar
  if (!org) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Criar meu time</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Dê um nome ao seu time (ex: Líderes Doctum). Depois você adiciona as pessoas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do time"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={criarTime}
            disabled={criando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar time
          </button>
        </div>
      </div>
    );
  }

  // Já tem time → gerenciar membros
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">{org.nome}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
        </span>
      </div>

      {/* Adicionar membro */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Adicionar pessoa</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A pessoa precisa ter entrado no app (login) ao menos uma vez. Aí você adiciona pelo
          e-mail dela.
        </p>
        <form onSubmit={adicionar} className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dapessoa.com"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addBusy || !email}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {addBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </button>
        </form>
        {erro && (
          <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </div>
        )}
      </div>

      {/* Lista de membros */}
      {membros.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Ninguém no time ainda. Adicione a primeira pessoa pelo e-mail acima.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {membros.map((m) => (
            <li key={m.membroId} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {m.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {m.nome}
                  {m.papel === 'GESTOR' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <button
                type="button"
                onClick={() => remover(m.membroId)}
                disabled={removendo === m.membroId}
                className="rounded-lg p-2 text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label="Remover"
              >
                {removendo === m.membroId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Em breve: o <b>Painel do Time</b> com o tempo e a distribuição de cada um, e a análise
        da IA do time.
      </p>
    </div>
  );
}
