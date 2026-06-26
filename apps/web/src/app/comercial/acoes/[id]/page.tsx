import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getAcao, listarTipos, OBJETIVOS, RESULTADOS } from '@/lib/comercial';
import { ComercialShell } from '../../comercial-shell';
import { ResultadoForm } from './resultado-form';
import { AcaoForm } from '../acao-form';
import { ExcluirAcaoButton } from './excluir-acao';
import { carregarComercial } from '../../contexto';
import { fmtMoney, fmtPeriodo } from '../../fmt';

export const metadata = { title: 'Ação · Comercial' };

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AcaoDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/comercial/acoes/${params.id}`);
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  const a = await getAcao(user.id, params.id);
  if (!a) redirect('/comercial/acoes');
  const tipos = await listarTipos(orgId);

  // Trava por repasse: ação vinculada a um repasse tem edição/exclusão restrita.
  const ehGestor = escopo.podeConfigRepasse; // corporativo ou admin
  const travada = a.repasseId != null;
  const repasseFechado = a.repasse != null && a.repasse.status !== 'PENDENTE';
  const podeEditar = !travada || ehGestor;
  const podeExcluir = !travada || (ehGestor && !repasseFechado);
  const selo = travada ? (repasseFechado ? 'Em repasse · fechado' : 'Em repasse · pendente') : null;

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <Link
        href="/comercial/acoes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Ações
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
          {a.tipo}
        </span>
        <span className="text-xs text-muted-foreground">{a.unidade.nome}</span>
        {selo && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            🔒 {selo}
          </span>
        )}
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">{a.local}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        🎯 {a.objetivo}
        {a.responsaveis && ` · 👥 ${a.responsaveis}`} · 📅 {fmtPeriodo(iso(a.dataInicio), iso(a.dataFim))} · 💰{' '}
        solicitado {fmtMoney(a.valorSolicitado)}
      </p>
      {a.detalhe && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Planejamento / detalhe
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">{a.detalhe}</p>
        </div>
      )}

      <div className="mt-6">
        <ResultadoForm
          acaoId={a.id}
          valorSolicitado={a.valorSolicitado}
          resultados={RESULTADOS}
          inicial={{
            status: a.status,
            resultado: a.resultado,
            resultadoQtd: a.resultadoQtd,
            valorGasto: a.valorGasto,
            comentarios: a.comentarios,
          }}
        />
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
          Editar planejamento da ação
        </summary>
        <div className="mt-4">
          {podeEditar ? (
            <AcaoForm
              acaoId={a.id}
              unidades={escopo.unidades.map((u) => ({ id: u.id, nome: u.nome }))}
              tipos={tipos}
              objetivos={OBJETIVOS}
              inicial={{
                unidadeId: a.unidadeId,
                tipo: a.tipo,
                objetivo: a.objetivo,
                local: a.local,
                responsaveis: a.responsaveis,
                dataInicio: iso(a.dataInicio),
                dataFim: iso(a.dataFim),
                valorSolicitado: a.valorSolicitado?.toString() ?? '',
                detalhe: a.detalhe ?? '',
              }}
            />
          ) : (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              🔒 Esta ação já entrou num repasse — só <b>corporativo/admin</b> pode editar. Para liberar
              a edição, remova o repasse na aba <b>Repasses</b>.
            </p>
          )}
        </div>
      </details>

      <div className="mt-8 border-t border-border pt-5">
        {podeExcluir ? (
          <ExcluirAcaoButton acaoId={a.id} local={a.local} />
        ) : (
          <p className="text-xs text-muted-foreground">
            🔒 Não dá pra excluir esta ação:{' '}
            {repasseFechado
              ? 'o repasse já foi fechado.'
              : 'ela está num repasse — só corporativo/admin enquanto o repasse estiver pendente.'}
          </p>
        )}
      </div>
    </ComercialShell>
  );
}
