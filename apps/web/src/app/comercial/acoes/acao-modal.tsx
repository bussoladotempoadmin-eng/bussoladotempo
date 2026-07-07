'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, ArrowRightLeft, PenLine, Pencil, Loader2, X, ArrowLeft, Building2 } from 'lucide-react';
import type { AcaoListItem, EmpresaAdmin } from '@/lib/comercial';
import { useToast } from '@/components/toast';
import { AcaoForm } from './acao-form';
import { fmtMoney, fmtNum, fmtPeriodo } from '../fmt';

type Opt = { id: string; nome: string };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  EM_PLANEJAMENTO: { label: 'Em planejamento', cls: 'bg-muted text-muted-foreground' },
  FINALIZADO: { label: 'Finalizado', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  ADIADO: { label: 'Adiado', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  CANCELADO: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
};

const INP = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

type Modo = 'menu' | 'editar' | 'reagendar' | 'realocar' | 'mover-empresa';

export function AcaoModal({
  acao,
  unidades,
  tipos,
  objetivos,
  podeGerenciar = false,
  onClose,
}: {
  acao: AcaoListItem;
  unidades: Opt[];
  tipos: Opt[];
  objetivos: readonly string[];
  podeGerenciar?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [modo, setModo] = React.useState<Modo>('menu');

  const travadoPraVoce = acao.travada && !podeGerenciar; // em repasse e não é gestor
  const st = STATUS_STYLE[acao.status];

  function feitoESai() {
    onClose();
    router.refresh();
  }

  const titulo =
    modo === 'editar'
      ? 'Editar ação'
      : modo === 'reagendar'
        ? 'Reagendar'
        : modo === 'realocar'
          ? 'Realocar'
          : modo === 'mover-empresa'
            ? 'Mover pra outra empresa'
            : acao.local;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {modo !== 'menu' && (
              <button
                type="button"
                onClick={() => setModo('menu')}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h3 className="text-base font-bold">{titulo}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {modo === 'menu' && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {acao.tipo}
              </span>
              <span className="text-xs text-muted-foreground">{acao.unidadeNome}</span>
              {acao.travada && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  🔒 Em repasse{acao.repasseFechado ? ' · fechado' : ''}
                </span>
              )}
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              🎯 {acao.objetivo}
              {acao.responsaveis && ` · 👥 ${acao.responsaveis}`} · 📅 {fmtPeriodo(acao.dataInicio, acao.dataFim)}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-dashed border-border pt-3 text-sm">
              <Kv label="Solicitado" valor={fmtMoney(acao.valorSolicitado)} />
              <Kv label="Gasto" valor={fmtMoney(acao.valorGasto)} />
              <Kv label="Leads" valor={fmtNum(acao.resultadoQtd)} cor="text-emerald-600 dark:text-emerald-400" />
            </div>

            {acao.detalhe && (
              <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Planejamento</p>
                <p className="whitespace-pre-wrap leading-relaxed">{acao.detalhe}</p>
              </div>
            )}

            {travadoPraVoce && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                🔒 Esta ação está num repasse — só <b>corporativo/admin</b> pode editar. Para liberar, remova o
                repasse na aba <b>Repasses</b>.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Link
                href={`/comercial/acoes/${acao.id}`}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground"
              >
                <PenLine className="h-4 w-4" />
                Registrar resultado
              </Link>
              <BotaoMenu icon={<Pencil className="h-4 w-4" />} label="Editar" onClick={() => setModo('editar')} disabled={travadoPraVoce} />
              <BotaoMenu icon={<CalendarClock className="h-4 w-4" />} label="Reagendar" onClick={() => setModo('reagendar')} disabled={travadoPraVoce} />
              <BotaoMenu icon={<ArrowRightLeft className="h-4 w-4" />} label="Realocar" onClick={() => setModo('realocar')} disabled={travadoPraVoce} />
              {podeGerenciar && (
                <BotaoMenu
                  icon={<Building2 className="h-4 w-4" />}
                  label="Mover empresa"
                  onClick={() => setModo('mover-empresa')}
                  disabled={acao.travada}
                />
              )}
            </div>
          </div>
        )}

        {modo === 'editar' && (
          <AcaoForm
            acaoId={acao.id}
            unidades={unidades}
            tipos={tipos}
            objetivos={objetivos}
            embedded
            inicial={{
              unidadeId: acao.unidadeId,
              tipo: acao.tipo,
              objetivo: acao.objetivo,
              local: acao.local,
              responsaveis: acao.responsaveis,
              dataInicio: acao.dataInicio,
              dataFim: acao.dataFim,
              valorSolicitado: acao.valorSolicitado?.toString() ?? '',
              detalhe: acao.detalhe ?? '',
            }}
            onCancel={() => setModo('menu')}
            onSaved={feitoESai}
          />
        )}

        {modo === 'reagendar' && <ReagendarBody acao={acao} onDone={feitoESai} />}
        {modo === 'realocar' && <RealocarBody acao={acao} unidades={unidades} onDone={feitoESai} />}
        {modo === 'mover-empresa' && <MoverEmpresaBody acaoId={acao.id} onDone={feitoESai} />}
      </div>
    </div>
  );
}

function BotaoMenu({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Ação em repasse — só corporativo/admin edita' : undefined}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function Kv({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label} </span>
      <span className={`font-bold ${cor ?? ''}`}>{valor}</span>
    </div>
  );
}

function ReagendarBody({ acao, onDone }: { acao: AcaoListItem; onDone: () => void }) {
  const { toast } = useToast();
  const [ini, setIni] = React.useState(acao.dataInicio);
  const [fim, setFim] = React.useState(acao.dataFim);
  const [busy, setBusy] = React.useState(false);

  async function salvar() {
    setBusy(true);
    await fetch(`/api/comercial/acoes/${acao.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'reagendar', dataInicio: ini, dataFim: fim || ini }),
    });
    toast('Ação reagendada');
    onDone();
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-xs font-semibold text-muted-foreground">
          Início
          <input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className={`mt-1 ${INP}`} />
        </label>
        <label className="flex flex-col text-xs font-semibold text-muted-foreground">
          Fim
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={`mt-1 ${INP}`} />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">A ação volta pra &ldquo;Em planejamento&rdquo;.</p>
      <button
        type="button"
        onClick={salvar}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
        Salvar nova data
      </button>
    </div>
  );
}

function RealocarBody({ acao, unidades, onDone }: { acao: AcaoListItem; unidades: Opt[]; onDone: () => void }) {
  const { toast } = useToast();
  const [unidadeId, setUnidadeId] = React.useState(acao.unidadeId);
  const [resp, setResp] = React.useState(acao.responsaveis);
  const [busy, setBusy] = React.useState(false);

  async function salvar() {
    setBusy(true);
    await fetch(`/api/comercial/acoes/${acao.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'realocar', unidadeId, responsaveis: resp }),
    });
    toast('Ação realocada');
    onDone();
  }

  return (
    <div>
      <label className="flex flex-col text-xs font-semibold text-muted-foreground">
        Unidade
        <select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} className={`mt-1 ${INP}`}>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col text-xs font-semibold text-muted-foreground">
        Responsáveis
        <input value={resp} onChange={(e) => setResp(e.target.value)} className={`mt-1 ${INP}`} placeholder="Ex: Mariana, Regina" />
      </label>
      <button
        type="button"
        onClick={salvar}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
        Mover ação
      </button>
    </div>
  );
}

function MoverEmpresaBody({ acaoId, onDone }: { acaoId: string; onDone: () => void }) {
  const { toast } = useToast();
  const [empresas, setEmpresas] = React.useState<EmpresaAdmin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState('');
  const [unidadeId, setUnidadeId] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancel = false;
    fetch('/api/comercial/empresas')
      .then((r) => (r.ok ? r.json() : { empresas: [] }))
      .then((d: { empresas?: EmpresaAdmin[] }) => {
        if (cancel) return;
        // Só empresas DIFERENTES da atual e que já têm ao menos uma unidade destino.
        const dest = (d.empresas ?? []).filter((e) => !e.ehAtual && e.unidadesList.length > 0);
        setEmpresas(dest);
        if (dest[0]) {
          setOrgId(dest[0].id);
          setUnidadeId(dest[0].unidadesList[0]?.id ?? '');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const unidadesDestino = empresas.find((e) => e.id === orgId)?.unidadesList ?? [];

  function trocarEmpresa(id: string) {
    setOrgId(id);
    const emp = empresas.find((e) => e.id === id);
    setUnidadeId(emp?.unidadesList[0]?.id ?? '');
  }

  async function salvar() {
    if (!unidadeId) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/comercial/acoes/${acaoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'mover-empresa', destinoUnidadeId: unidadeId }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        toast(d?.error ?? 'Não consegui mover.', 'erro');
        return;
      }
      toast('Ação movida.');
      onDone();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando empresas…</p>;
  if (empresas.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Não há outra empresa com unidade pra onde mover esta ação.
      </p>
    );

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        A ação sai desta empresa e vai pra unidade escolhida em outra. Ação em repasse não pode ser movida.
      </p>
      <label className="flex flex-col text-xs font-semibold text-muted-foreground">
        Empresa destino
        <select value={orgId} onChange={(e) => trocarEmpresa(e.target.value)} className={`mt-1 ${INP}`}>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col text-xs font-semibold text-muted-foreground">
        Unidade destino
        <select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} className={`mt-1 ${INP}`}>
          {unidadesDestino.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={salvar}
        disabled={busy || !unidadeId}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
        Mover ação
      </button>
    </div>
  );
}
