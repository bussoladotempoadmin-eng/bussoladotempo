import Link from 'next/link';
import { notFound } from 'next/navigation';
import { parceiroDetalhe } from '@/lib/comissoes';
import { fmtMoney, fmtData, STATUS_LABEL, STATUS_CLASSE } from '../../fmt';
import { ParceiroAcoes, ComissoesPagar } from './acoes-parceiro';

export const dynamic = 'force-dynamic';

const COMISSAO_LABEL: Record<string, string> = {
  PENDENTE: 'Em carência',
  DISPONIVEL: 'A pagar',
  PAGA: 'Paga',
  ESTORNADA: 'Estornada',
};

export default async function ParceiroDetalhePage({ params }: { params: { id: string } }) {
  const d = await parceiroDetalhe(params.id);
  if (!d) notFound();
  const { parceiro, indicados, comissoes } = d;

  const disponiveis = comissoes.filter((c) => c.status === 'DISPONIVEL');
  const totalDisponivel = disponiveis.reduce((s, c) => s + c.comissao, 0);

  return (
    <div className="space-y-5">
      <Link href="/admin/parceiros" className="text-sm text-muted-foreground hover:text-primary">
        ← Parceiros
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{parceiro.nome}</h1>
          <p className="text-sm text-muted-foreground">
            Código <span className="font-mono">{parceiro.code}</span>
            {parceiro.email ? ` · ${parceiro.email}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${parceiro.ativo ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
          {parceiro.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <ParceiroAcoes
        id={parceiro.id}
        nome={parceiro.nome}
        email={parceiro.email ?? ''}
        comissaoRate={parceiro.comissaoRate}
        pixChave={parceiro.pixChave ?? ''}
        ativo={parceiro.ativo}
      />

      {/* Comissões a pagar */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">A pagar agora</div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(totalDisponivel)}</div>
        </div>
        {disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma comissão liberada no momento.</p>
        ) : (
          <ComissoesPagar ids={disponiveis.map((c) => c.id)} pix={parceiro.pixChave ?? ''} />
        )}
      </div>

      {/* Indicados */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Clientes indicados ({indicados.length})</h2>
        {indicados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhum cliente indicado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {indicados.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link href={`/admin/contas/${a.id}`} className="hover:text-primary">
                  {a.owner.name?.trim() || a.owner.email}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Histórico de comissões */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Comissões</h2>
        {comissoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhuma comissão gerada.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {comissoes.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <div className="font-semibold">{fmtMoney(c.comissao)}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.rate}% de {fmtMoney(c.valor)} · libera {fmtData(c.disponivelEm)}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{COMISSAO_LABEL[c.status] ?? c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
