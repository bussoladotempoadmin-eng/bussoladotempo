'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, UserCog, ShieldCheck, Pencil, Clock, Building2 } from 'lucide-react';
import { useToast } from '@/components/toast';
import type { AcessoComercialInfo } from '@/lib/comercial';

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

type UnidadeOpt = { id: string; nome: string };

export function AcessosView({
  orgId,
  acessos,
  unidades,
  assentosUsados,
}: {
  orgId: string;
  acessos: AcessoComercialInfo[];
  unidades: UnidadeOpt[];
  assentosUsados: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const nomeUnidade = React.useMemo(() => new Map(unidades.map((u) => [u.id, u.nome])), [unidades]);
  const formRef = React.useRef<HTMLDivElement>(null);

  const [email, setEmail] = React.useState('');
  const [rotulo, setRotulo] = React.useState('');
  const [nivel, setNivel] = React.useState<'VER' | 'EDITAR'>('EDITAR');
  const [todas, setTodas] = React.useState(false);
  const [admin, setAdmin] = React.useState(false);
  const [podeCriarEmpresa, setPodeCriarEmpresa] = React.useState(false);
  const [sel, setSel] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [editando, setEditando] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState('');

  const acessosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return acessos;
    return acessos.filter((a) => `${a.nome} ${a.email} ${a.rotulo ?? ''}`.toLowerCase().includes(q));
  }, [acessos, busca]);

  function toggleUnidade(id: string) {
    setSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function editar(a: AcessoComercialInfo) {
    setEmail(a.email);
    setRotulo(a.rotulo ?? '');
    setNivel(a.nivel);
    setTodas(a.todasUnidades);
    setAdmin(a.admin);
    setPodeCriarEmpresa(a.podeCriarEmpresa);
    setSel(a.todasUnidades ? [] : a.unidadesIds);
    setEditando(a.email);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function limparForm() {
    setEmail('');
    setRotulo('');
    setNivel('EDITAR');
    setTodas(false);
    setAdmin(false);
    setPodeCriarEmpresa(false);
    setSel([]);
    setEditando(null);
  }

  function fmtLogin(iso: string | null): string {
    if (!iso) return 'nunca acessou';
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function adicionar() {
    if (!email.trim()) return toast('Informe o e-mail.', 'erro');
    if (!todas && sel.length === 0) return toast('Escolha as unidades ou marque "todas".', 'erro');
    setBusy(true);
    try {
      const res = await fetch('/api/comercial/acessos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgId,
          email: email.trim(),
          nivel,
          todasUnidades: todas,
          unidadeIds: todas ? [] : sel,
          admin,
          podeCriarEmpresa,
          rotulo: rotulo.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Não consegui salvar.', 'erro');
        return;
      }
      toast('Acesso salvo.');
      limparForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remover(acessoId: string) {
    if (!confirm('Remover este acesso?')) return;
    const res = await fetch('/api/comercial/acessos', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgId, acessoId }),
    });
    if (res.ok) {
      toast('Acesso removido.');
      router.refresh();
    } else {
      toast('Não consegui remover.', 'erro');
    }
  }

  return (
    <div className="space-y-6">
      {/* Adicionar / editar acesso */}
      <div ref={formRef} className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <UserCog className="h-4 w-4" />
            {editando ? `Editando: ${editando}` : 'Adicionar / atualizar acesso'}
          </div>
          {editando && (
            <button type="button" onClick={limparForm} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Cancelar edição
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">E-mail da pessoa</span>
            <input
              className={`${INP} ${editando ? 'opacity-60' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editando}
              placeholder="pessoa@empresa.com"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">Rótulo (opcional)</span>
            <input className={INP} value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Coordenador, Consultor, Gerente…" />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">Nível</span>
            <select className={INP} value={nivel} onChange={(e) => setNivel(e.target.value as 'VER' | 'EDITAR')}>
              <option value="EDITAR">Ver e editar</option>
              <option value="VER">Só visualizar</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
            <span className="font-semibold">Corporativo / admin</span>
            <span className="text-xs text-muted-foreground">(gerencia acessos)</span>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={podeCriarEmpresa} onChange={(e) => setPodeCriarEmpresa(e.target.checked)} />
            <span className="font-semibold">Pode criar nova empresa</span>
            <span className="text-xs text-muted-foreground">(abrir outras empresas no seletor)</span>
          </label>
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} />
            <span className="font-semibold">Todas as unidades</span>
          </label>
          {!todas && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unidades.length === 0 && <span className="text-xs text-muted-foreground">Crie unidades primeiro.</span>}
              {unidades.map((u) => {
                const on = sel.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUnidade(u.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {u.nome}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={adicionar}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Salvar acesso
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          A pessoa precisa ter entrado no app uma vez. <b>{assentosUsados}</b> assento(s) em uso (todo acesso conta 1).
        </p>
      </div>

      {/* Lista */}
      {acessos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Nenhum acesso configurado ainda. O dono e os coordenadores atuais continuam acessando normalmente.
        </p>
      ) : (
        <div className="space-y-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou função…"
            className={INP}
          />
          {acessosFiltrados.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-5 text-center text-sm text-muted-foreground">
              Ninguém encontrado para “{busca}”.
            </p>
          ) : (
            acessosFiltrados.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.nome}</span>
                  {a.rotulo && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{a.rotulo}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.nivel === 'EDITAR' ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {a.nivel === 'EDITAR' ? 'edita' : 'só vê'}
                  </span>
                  {a.admin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <ShieldCheck className="h-3 w-3" /> admin
                    </span>
                  )}
                  {a.podeCriarEmpresa && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/12 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <Building2 className="h-3 w-3" /> cria empresa
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {a.email} · {a.todasUnidades ? 'todas as unidades' : a.unidadesIds.map((id) => nomeUnidade.get(id) ?? '?').join(', ') || 'sem unidade'}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Último acesso: <b className="font-semibold">{fmtLogin(a.ultimoLoginEm)}</b>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => editar(a)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Editar"
                  title="Editar acesso"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remover(a.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
