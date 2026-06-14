'use client';

import * as React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { workspaceSchema, timezones } from '@/lib/schemas/workspace';
import { useToast } from '@/components/toast';

export type WorkspaceDTO = {
  nome: string;
  timezone: string;
  semanaInicio: 'DOMINGO' | 'SEGUNDA';
  horaAcordar: string;
  horaDormir: string;
  horaAlmocoIni: string;
  horaAlmocoFim: string;
};

export function ConfiguracoesForm({ initial }: { initial: WorkspaceDTO }) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<WorkspaceDTO>(initial);
  const [busy, setBusy] = React.useState(false);
  const [salvo, setSalvo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof WorkspaceDTO>(key: K, value: WorkspaceDTO[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSalvo(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = workspaceSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui salvar. Tente de novo.');
      return;
    }
    setSalvo(true);
    toast('Configurações salvas');
  }

  const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <form onSubmit={salvar} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Nome do workspace</span>
        <input value={form.nome} onChange={(e) => set('nome', e.target.value)} className={field} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Acordo às</span>
          <input
            type="time"
            value={form.horaAcordar}
            onChange={(e) => set('horaAcordar', e.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Durmo às</span>
          <input
            type="time"
            value={form.horaDormir}
            onChange={(e) => set('horaDormir', e.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Almoço — início</span>
          <input
            type="time"
            value={form.horaAlmocoIni}
            onChange={(e) => set('horaAlmocoIni', e.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Almoço — fim</span>
          <input
            type="time"
            value={form.horaAlmocoFim}
            onChange={(e) => set('horaAlmocoFim', e.target.value)}
            className={field}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Semana começa em</span>
          <select
            value={form.semanaInicio}
            onChange={(e) => set('semanaInicio', e.target.value as WorkspaceDTO['semanaInicio'])}
            className={field}
          >
            <option value="SEGUNDA">Segunda</option>
            <option value="DOMINGO">Domingo</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Fuso horário</span>
          <select
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
            className={field}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('America/', '').replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {salvo && <span className="text-sm font-medium text-emerald-600">Salvo ✓</span>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar
        </button>
      </div>
    </form>
  );
}
