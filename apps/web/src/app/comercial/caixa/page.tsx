import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { getCaixaUnidade } from '@/lib/comercial-caixa';
import { ComercialShell } from '../comercial-shell';
import { carregarComercial } from '../contexto';
import { CaixaView } from './caixa-view';

export const metadata = { title: 'Caixa · Comercial' };
export const dynamic = 'force-dynamic';

export default async function CaixaPage({ searchParams }: { searchParams: { u?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/caixa');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  const unidades = escopo.unidades;
  const unidadeId =
    searchParams.u && unidades.some((u) => u.id === searchParams.u)
      ? searchParams.u
      : unidades[0]?.id ?? null;

  const caixa = unidadeId ? await getCaixaUnidade(user.id, unidadeId) : null;
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome ?? '';

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <h1 className="text-2xl font-extrabold tracking-tight">Caixa</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Saldo e extrato de verba por unidade. Gastos de ações finalizadas entram como saída automática.
      </p>

      {unidades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="font-semibold">Nenhuma unidade ainda.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma unidade em <Link href="/comercial/unidades" className="text-primary underline">Unidades</Link> pra abrir o caixa dela.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {unidades.map((u) => (
              <Link
                key={u.id}
                href={`/comercial/caixa?u=${u.id}`}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                  u.id === unidadeId
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {u.nome}
              </Link>
            ))}
          </div>

          {caixa && unidadeId && (
            <CaixaView
              unidadeId={unidadeId}
              unidadeNome={unidadeNome}
              caixa={caixa}
              podeEditar={!escopo.somenteLeitura}
            />
          )}
        </>
      )}
    </ComercialShell>
  );
}
