'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Trash2, Loader2, Pencil, Check, X, UserMinus, Landmark } from 'lucide-react';
import type { UnidadeInfo, RepasseUnidade } from '@/lib/comercial';
import { useToast } from '@/components/toast';

export function UnidadesView({
  inicial,
  ehDono,
  orgId,
  podeConfigRepasse = false,
  repasses = {},
}: {
  inicial: UnidadeInfo[];
  ehDono: boolean;
  orgId: string;
  podeConfigRepasse?: boolean;
  repasses?: Record<string, RepasseUnidade>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // edição de unidade existente
  const [editId, setEditId] = React.useState<string | null>(null);
  const [repasseId, setRepasseId] = React.useState<string | null>(null);
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
                <div className="flex items-center gap-1">
                  {podeConfigRepasse && (
                    <button
                      type="button"
                      onClick={() => {
                        setRepasseId(repasseId === u.id ? null : u.id);
                        setEditId(null);
                      }}
                      className={`rounded-lg p-2 hover:bg-muted ${
                        repasses[u.id]?.metodo ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="Repasse"
                      title="Configurar repasse"
                    >
                      <Landmark className="h-4 w-4" />
                    </button>
                  )}
                  {ehDono && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(editId === u.id ? null : u.id);
                          if (editId !== u.id) abrirEdicao(u);
                          setRepasseId(null);
                        }}
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
                    </>
                  )}
                </div>
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

              {podeConfigRepasse && repasseId === u.id && (
                <RepasseEditor
                  unidadeId={u.id}
                  inicial={repasses[u.id]}
                  onCancel={() => setRepasseId(null)}
                  onSaved={() => {
                    setRepasseId(null);
                    toast('Repasse atualizado');
                    router.refresh();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const RINP = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

function RepasseEditor({
  unidadeId,
  inicial,
  onCancel,
  onSaved,
}: {
  unidadeId: string;
  inicial?: RepasseUnidade;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [ativo, setAtivo] = React.useState(!!inicial?.metodo);
  const [metodo, setMetodo] = React.useState<'CARTAO_CORPORATIVO' | 'TRANSFERENCIA'>(
    inicial?.metodo === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'CARTAO_CORPORATIVO',
  );
  const [banco, setBanco] = React.useState(inicial?.banco ?? '');
  const [agencia, setAgencia] = React.useState(inicial?.agencia ?? '');
  const [conta, setConta] = React.useState(inicial?.conta ?? '');
  const [tipoConta, setTipoConta] = React.useState<'CORRENTE' | 'POUPANCA'>(
    inicial?.tipoConta === 'POUPANCA' ? 'POUPANCA' : 'CORRENTE',
  );
  const [pix, setPix] = React.useState(inicial?.pix ?? '');
  const [cpfCnpj, setCpfCnpj] = React.useState(inicial?.cpfCnpj ?? '');
  const [titular, setTitular] = React.useState(inicial?.titular ?? '');
  const [busy, setBusy] = React.useState(false);

  async function salvar() {
    setBusy(true);
    const payload: Record<string, unknown> = {
      acao: 'repasse',
      id: unidadeId,
      metodo: ativo ? metodo : null,
    };
    if (ativo && metodo === 'TRANSFERENCIA') {
      Object.assign(payload, { banco, agencia, conta, tipoConta, pix, cpfCnpj, titular });
    }
    const r = await fetch('/api/comercial/unidades', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      toast(d?.error ?? 'Não consegui salvar o repasse.', 'erro');
      return;
    }
    onSaved();
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4" />
        Acrescentar informações para repasse
      </label>

      {ativo && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMetodo('CARTAO_CORPORATIVO')}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                metodo === 'CARTAO_CORPORATIVO' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
              }`}
            >
              Cartão corporativo
            </button>
            <button
              type="button"
              onClick={() => setMetodo('TRANSFERENCIA')}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                metodo === 'TRANSFERENCIA' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
              }`}
            >
              Transferência bancária
            </button>
          </div>

          {metodo === 'TRANSFERENCIA' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Banco" value={banco} onChange={setBanco} placeholder="Ex: Banco do Brasil" />
              <Campo label="Agência" value={agencia} onChange={setAgencia} placeholder="0000" />
              <Campo label="Conta" value={conta} onChange={setConta} placeholder="00000-0" />
              <label className="flex flex-col">
                <span className="mb-1 text-xs font-semibold text-muted-foreground">Tipo de conta</span>
                <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value as 'CORRENTE' | 'POUPANCA')} className={RINP}>
                  <option value="CORRENTE">Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                </select>
              </label>
              <Campo label="Pix" value={pix} onChange={setPix} placeholder="Chave Pix" />
              <Campo label="CPF / CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="Só números" />
              <div className="sm:col-span-2">
                <Campo label="Nome completo / Razão social" value={titular} onChange={setTitular} placeholder="Titular da conta" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar repasse
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col">
      <span className="mb-1 text-xs font-semibold text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={RINP} />
    </label>
  );
}
