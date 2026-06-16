'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Trash2, Loader2, Pencil, Check, X, UserMinus } from 'lucide-react';
import type { UnidadeInfo } from '@/lib/comercial';
import { useToast } from '@/components/toast';

export function UnidadesView({
  inicial,
  ehDono,
  orgId,
}: {
  inicial: UnidadeInfo[];
  ehDono: boolean;
  orgId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // edição de unidade existente
  const [editId, setEditId] = React.useState<string | null>(null);
  const [eNome, setENome] = React.useState('');
  const [eEmail, setEEmail] = React.useState('');
  const [eBusy, setEBusy] = React.useState(false);
  const [eErro, setEErro] = React.useState<string | null>(null);

  function abrirEdicao(u: UnidadeInfo) {
    setEditId(u.id);
    setENome(u.nome);
    setEEmail('');
    setEErro(null);
  }

  async function patchUnidade(payload: Record<string, unknown>) {
    setEBusy(true);
    setEErro(null);
    const r = await fetch('/api/comercial/unidades', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setEErro(d?.error ?? 'Não consegui salvar.');
      return false;
    }
    return true;
  }

  async function salvarEdicao() {
    if (!editId) return;
    const ok = await patchUnidade({
      id: editId,
      nome: eNome,
      // só mexe no coordenador se digitou um e-mail
      coordenadorEmail: eEmail.trim() ? eEmail.trim() : undefined,
    });
    if (ok) {
      setEditId(null);
      toast('Unidade atualizada');
      router.refresh();
    }
  }

  async function removerCoordenador(id: string) {
    const ok = await patchUnidade({ id, coordenadorEmail: '' });
    if (ok) {
      setEditId(null);
      toast('Coordenador removido');
      router.refresh();
    }
  }

  async function adicionar() {
    if (!nome.trim()) return;
    setBusy(true);
    setErro(null);
    const r = await fetch('/api/comercial/unidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, nome, coordenadorEmail: email || undefined }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui adicionar.');
      return;
    }
    setNome('');
    setEmail('');
    toast('Unidade adicionada');
    router.refresh();
  }

  async function remover(id: string) {
    if (!confirm('Remover esta unidade? As ações dela também serão apagadas.')) return;
    await fetch('/api/comercial/unidades', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast('Unidade removida');
    router.refresh();
  }

  return (
    <div>
      {ehDono && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-bold">Nova unidade</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-semibold text-muted-foreground">Cidade / unidade</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Serra"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-semibold text-muted-foreground">
                E-mail do coordenador (opcional)
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordenador@email.com"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={adicionar}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
          {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            O coordenador vê e edita só as ações da unidade dele. Ele precisa ter entrado no app uma vez.
          </p>
        </div>
      )}

      {inicial.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Nenhuma unidade ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {inicial.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                  </span>
                  <div>
                    <p className="font-semibold">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.coordenadorNome ? `Coordenador: ${u.coordenadorNome}` : 'Sem coordenador'}
                    </p>
                  </div>
                </div>
                {ehDono && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => (editId === u.id ? setEditId(null) : abrirEdicao(u))}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remover(u.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {ehDono && editId === u.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col">
                      <span className="mb-1 text-xs font-semibold text-muted-foreground">Cidade / unidade</span>
                      <input
                        value={eNome}
                        onChange={(e) => setENome(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="mb-1 text-xs font-semibold text-muted-foreground">
                        {u.coordenadorNome ? 'Trocar coordenador (e-mail)' : 'Definir coordenador (e-mail)'}
                      </span>
                      <input
                        value={eEmail}
                        onChange={(e) => setEEmail(e.target.value)}
                        placeholder={u.coordenadorNome ? `Atual: ${u.coordenadorNome}` : 'coordenador@email.com'}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  {eErro && <p className="mt-2 text-xs text-destructive">{eErro}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={salvarEdicao}
                      disabled={eBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {eBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                    {u.coordenadorNome && (
                      <button
                        type="button"
                        onClick={() => removerCoordenador(u.id)}
                        disabled={eBusy}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                      >
                        <UserMinus className="h-4 w-4" />
                        Remover coordenador
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Deixe o e-mail em branco pra só renomear. O coordenador precisa ter entrado no app uma vez.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
