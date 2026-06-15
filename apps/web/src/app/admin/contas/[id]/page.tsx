import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contaDetalhe, listarPlanos } from '@/lib/admin-billing';
import { valorCobranca } from '@/lib/assinatura';
import { fmtMoney, fmtData, STATUS_LABEL, STATUS_CLASSE, ORIGEM_LABEL } from '../../fmt';
import { AcoesConta, CobrancaAcoes } from './acoes-conta';

export const dynamic = 'force-dynamic';

const COB_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  PAGA: 'Paga',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
};

export default async function ContaDetalhePage({ params }: { params: { id: string } }) {
  const [a, planos] = await Promise.all([contaDetalhe(params.id), listarPlanos()]);
  if (!a) notFound();

  const valorSugerido = valorCobranca(a.plano, a.assentos, a.ciclo);

  return (
    <div className="space-y-5">
      <Link href="/admin/contas" className="text-sm text-muted-foreground hover:text-primary">
        ← Contas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{a.owner.name?.trim() || a.owner.email}</h1>
          <p className="text-sm text-muted-foreground">{a.owner.email}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASSE[a.status]}`}>
          {STATUS_LABEL[a.status]}
        </span>
      </div>

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Plano" valor={a.plano.nome} />
        <Campo label="Ciclo" valor={a.ciclo === 'ANUAL' ? 'Anual' : 'Mensal'} />
        <Campo label="Assentos" valor={String(a.assentos)} />
        <Campo label="Valor / ciclo" valor={fmtMoney(valorSugerido)} />
        <Campo label="Trial até" valor={fmtData(a.trialTerminaEm)} />
        <Campo label="Plano expira" valor={fmtData(a.planoExpiraEm)} />
        <Campo label="Cliente desde" valor={fmtData(a.owner.createdAt)} />
        <Campo label="Origem" valor={ORIGEM_LABEL[a.origem]} />
        <Campo
          label="Time"
          valor={a.organizacao ? `${a.organizacao.nome} (${a.organizacao._count.membros} membros)` : '—'}
        />
      </div>

      {a.aguardandoAtivacao && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <b className="text-primary">Esta conta escolheu um plano e aguarda ativação.</b>{' '}
          <span className="text-muted-foreground">
            Combine o pagamento e, ao marcar uma cobrança como paga, a conta é ativada.
          </span>
        </div>
      )}

      {/* Ações */}
      <AcoesConta
        assinaturaId={a.id}
        status={a.status}
        planoSlug={a.plano.slug}
        assentos={a.assentos}
        ciclo={a.ciclo}
        notasInternas={a.notasInternas ?? ''}
        valorSugerido={valorSugerido}
        planos={planos.map((p) => ({ slug: p.slug, nome: p.nome }))}
        parceiroCode={a.parceiro?.code ?? ''}
      />

      {/* Cobranças */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Últimas cobranças</h2>
        {a.cobrancas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhuma cobrança ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {a.cobrancas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold">{fmtMoney(c.valor)}</div>
                  <div className="text-xs text-muted-foreground">
                    venc. {fmtData(c.vencimento)} · {c.metodo}
                    {c.pagaEm ? ` · paga ${fmtData(c.pagaEm)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{COB_LABEL[c.status] ?? c.status}</span>
                  <CobrancaAcoes cobrancaId={c.id} status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{valor}</div>
    </div>
  );
}
