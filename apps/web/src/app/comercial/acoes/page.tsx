import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { listarAcoes, STATUS_LABEL } from '@/lib/comercial';
import type { StatusAcao } from '@bussola/db';
import { ComercialShell } from '../comercial-shell';
import { AcoesTable } from './acoes-table';
import { carregarComercial } from '../contexto';
import { mesCorrente } from '../fmt';

export const metadata = { title: 'Ações · Comercial' };

const STATUS: StatusAcao[] = ['EM_PLANEJAMENTO', 'FINALIZADO', 'ADIADO', 'CANCELADO'];

export default async function AcoesPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string; unidade?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/acoes');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  const def = mesCorrente();
  const de = searchParams.de || def.de;
  const ate = searchParams.ate || def.ate;
  const unidade = searchParams.unidade || '';
  const status = (STATUS.includes(searchParams.status as StatusAcao) ? searchParams.status : '') as
    | StatusAcao
    | '';

  const acoes = await listarAcoes(user.id, orgId, {
    de,
    ate,
    unidadeId: unidade || undefined,
    status: status || undefined,
  });

  const sel = 'rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold outline-none';

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Ações comerciais</h1>
        <Link
          href="/comercial/acoes/nova"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Nova ação
        </Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <label className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">De</span>
            <input type="date" name="de" defaultValue={de} className="bg-transparent text-sm font-semibold outline-none" />
          </label>
          <span className="pb-1 text-muted-foreground">→</span>
          <label className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Até</span>
            <input type="date" name="ate" defaultValue={ate} className="bg-transparent text-sm font-semibold outline-none" />
          </label>
        </div>
        <select name="unidade" defaultValue={unidade} className={sel}>
          <option value="">Todas as unidades</option>
          {escopo.unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={sel}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
          Filtrar
        </button>
      </form>

      <div className="mt-5">
        <AcoesTable acoes={acoes} unidades={escopo.unidades.map((u) => ({ id: u.id, nome: u.nome }))} />
      </div>
    </ComercialShell>
  );
}
