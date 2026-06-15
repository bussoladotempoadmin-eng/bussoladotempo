'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/toast';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

type CupomView = {
  id: string;
  code: string;
  descontoTipo: string;
  descontoValor: number;
  duracaoTipo: string;
  usados: number;
  maxUsos: number | null;
  validoAte: string | null;
  ativo: boolean;
  descontoLabel: string;
  validoAteLabel: string;
};

export function CuponsUI({ cupons }: { cupons: CupomView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  const [code, setCode] = React.useState('');
  const [tipo, setTipo] = React.useState<'PERCENTUAL' | 'FIXO'>('PERCENTUAL');
  const [valor, setValor] = React.useState('10');
  const [duracao, setDuracao] = React.useState<'PRIMEIRO' | 'RECORRENTE'>('PRIMEIRO');
  const [maxUsos, setMaxUsos] = React.useState('');
  const [validoAte, setValidoAte] = React.useState('');

  async function criar() {
    if (!code.trim()) return toast('Informe o código.', 'erro');
    setBusy('criar');
    try {
      const res = await fetch('/api/admin/cupons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          descontoTipo: tipo,
          descontoValor: Number(valor) || 0,
          duracaoTipo: duracao,
          maxUsos: maxUsos ? Number(maxUsos) : null,
          validoAte: validoAte || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      toast('Cupom criado.');
      setCode('');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function alternar(id: string, ativo: boolean) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/cupons/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ativo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Falhou.', 'erro');
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Criar cupom */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Novo cupom
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Código</span>
            <input className={`${INP} font-mono`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BEMVINDO10" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Tipo</span>
            <select className={INP} value={tipo} onChange={(e) => setTipo(e.target.value as 'PERCENTUAL' | 'FIXO')}>
              <option value="PERCENTUAL">Percentual (%)</option>
              <option value="FIXO">Valor fixo (R$)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Valor</span>
            <input type="number" min={0} step="0.01" className={INP} value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Duração</span>
            <select className={INP} value={duracao} onChange={(e) => setDuracao(e.target.value as 'PRIMEIRO' | 'RECORRENTE')}>
              <option value="PRIMEIRO">Só 1ª cobrança</option>
              <option value="RECORRENTE">Recorrente</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Máx. usos (opcional)</span>
            <input type="number" min={0} className={INP} value={maxUsos} onChange={(e) => setMaxUsos(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Válido até (opcional)</span>
            <input type="date" className={INP} value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
          </label>
        </div>
        <button
          onClick={criar}
          disabled={busy !== null}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy === 'criar' && <Loader2 className="h-4 w-4 animate-spin" />} Criar cupom
        </button>
      </div>

      {/* Lista */}
      {cupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhum cupom ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {cupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{c.code}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c.descontoLabel}</span>
                  {!c.ativo && <span className="text-xs text-muted-foreground">inativo</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.duracaoTipo === 'PRIMEIRO' ? '1ª cobrança' : 'recorrente'} · usados {c.usados}
                  {c.maxUsos != null ? `/${c.maxUsos}` : ''} · {c.validoAteLabel}
                </div>
              </div>
              <button
                onClick={() => alternar(c.id, !c.ativo)}
                disabled={busy !== null}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
              >
                {c.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
