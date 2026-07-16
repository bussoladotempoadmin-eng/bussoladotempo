'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Settings2 } from 'lucide-react';
import { useToast } from '@/components/toast';
import type { CaixaUnidade } from '@/lib/comercial-caixa';
import { fmtMoney } from '../fmt';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDia(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function CaixaView({
  unidadeId,
  unidadeNome,
  caixa,
  podeEditar,
}: {
  unidadeId: string;
  unidadeNome: string;
  caixa: CaixaUnidade;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [aberto, setAberto] = React.useState(false);
  const [tipo, setTipo] = React.useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [valor, setValor] = React.useState('');
  const [data, setData] = React.useState(hoje());
  const [descricao, setDescricao] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [removendo, setRemovendo] = React.useState<string | null>(null);

  async function lancar() {
    if (!valor || Number(valor) <= 0) return toast('Informe um valor maior que zero.', 'erro');
    if (!descricao.trim()) return toast('Descreva o lançamento.', 'erro');
    setBusy(true);
    const res = await fetch('/api/comercial/caixa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unidadeId, tipo, valor: Number(valor), data, descricao }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error || 'Não consegui lançar.', 'erro');
    toast(tipo === 'ENTRADA' ? 'Entrada lançada.' : 'Saída lançada.');
    setValor('');
    setDescricao('');
    setAberto(false);
    router.refresh();
  }

  async function remover(id: string) {
    setRemovendo(id);
    const res = await fetch('/api/comercial/caixa', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const d = await res.json().catch(() => ({}));
    setRemovendo(null);
    if (!res.ok) return toast(d.error || 'Não consegui remover.', 'erro');
    toast('Lançamento removido.');
    router.refresh();
  }

  const saldoNeg = caixa.saldo < 0;

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className={`rounded-2xl border p-5 ${
            saldoNeg ? 'border-red-500/40 bg-red-500/5' : 'border-primary/40 bg-primary/5'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Saldo · {unidadeNome}
          </div>
          <div className={`mt-1 text-3xl font-extrabold tabular-nums ${saldoNeg ? 'text-red-600 dark:text-red-400' : ''}`}>
            {fmtMoney(caixa.saldo, 2)}
          </div>
          {saldoNeg && <div className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">Saldo negativo</div>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Entradas</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmtMoney(caixa.totalEntradas, 2)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Saídas</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {fmtMoney(caixa.totalSaidas, 2)}
          </div>
        </div>
      </div>

      {/* Lançar */}
      {podeEditar && (
        <div className="rounded-2xl border border-border bg-card p-4">
          {!aberto ? (
            <button
              onClick={() => setAberto(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Lançar entrada / saída
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setTipo('ENTRADA')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                    tipo === 'ENTRADA' ? 'bg-emerald-600 text-white' : 'border border-border hover:bg-muted'
                  }`}
                >
                  Entrada (verba)
                </button>
                <button
                  onClick={() => setTipo('SAIDA')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                    tipo === 'SAIDA' ? 'bg-red-600 text-white' : 'border border-border hover:bg-muted'
                  }`}
                >
                  Saída (gasto)
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col">
                  <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Valor (R$)</span>
                  <input type="number" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={INP} />
                </label>
                <label className="flex flex-col">
                  <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Data</span>
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={INP} />
                </label>
              </div>
              <label className="flex flex-col">
                <span className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Descrição</span>
                <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === 'ENTRADA' ? 'Ex: Verba recebida da matriz' : 'Ex: Material gráfico'} className={INP} />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={lancar}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lançar
                </button>
                <button onClick={() => setAberto(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extrato */}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Extrato</h2>
        {caixa.lancamentos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Sem lançamentos ainda. Lance a verba recebida pra começar.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-bold">Data</th>
                  <th className="px-3 py-2.5 font-bold">Lançamento</th>
                  <th className="px-3 py-2.5 text-right font-bold">Entrada</th>
                  <th className="px-3 py-2.5 text-right font-bold">Saída</th>
                  <th className="px-3 py-2.5 text-right font-bold">Saldo</th>
                  {podeEditar && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {caixa.lancamentos.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtDia(l.data)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {l.tipo === 'ENTRADA' ? (
                          <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                        )}
                        <span>{l.descricao}</span>
                        {l.automatico && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            <Settings2 className="h-3 w-3" /> auto
                          </span>
                        )}
                        {l.criadoPor && (
                          <span className="text-[11px] text-muted-foreground">· por {l.criadoPor}</span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {l.tipo === 'ENTRADA' ? fmtMoney(l.valor, 2) : ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-red-600 dark:text-red-400">
                      {l.tipo === 'SAIDA' ? fmtMoney(l.valor, 2) : ''}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${l.saldoApos < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {fmtMoney(l.saldoApos, 2)}
                    </td>
                    {podeEditar && (
                      <td className="px-3 py-2.5 text-right">
                        {!l.automatico && (
                          <button
                            onClick={() => remover(l.id)}
                            disabled={removendo === l.id}
                            title="Remover lançamento"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-60"
                          >
                            {removendo === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Saídas marcadas com <b>auto</b> vêm do valor gasto de ações finalizadas — edite na própria ação.
        </p>
      </div>
    </div>
  );
}
