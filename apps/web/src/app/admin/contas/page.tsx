import Link from 'next/link';
import { listarContas, listarPlanos } from '@/lib/admin-billing';
import { fmtData, STATUS_LABEL, STATUS_CLASSE, ORIGEM_LABEL } from '../fmt';
import type { StatusAssinatura, OrigemAssinatura } from '@bussola/db';
import { NovaContaButton } from './nova-conta';

export const dynamic = 'force-dynamic';

const STATUSES: StatusAssinatura[] = ['TRIAL', 'ATIVA', 'ATRASADA', 'SUSPENSA', 'CANCELADA'];
const ORIGENS: OrigemAssinatura[] = ['AUTO', 'TRIBO', 'CADASTRO', 'ADMIN'];

export default async function ContasPage({
  searchParams,
}: {
  searchParams: { status?: string; plano?: string; origem?: string; ativar?: string; q?: string; page?: string };
}) {
  const status = STATUSES.includes(searchParams.status as StatusAssinatura)
    ? (searchParams.status as StatusAssinatura)
    : undefined;
  const origem = ORIGENS.includes(searchParams.origem as OrigemAssinatura)
    ? (searchParams.origem as OrigemAssinatura)
    : undefined;
  const aguardandoAtivacao = searchParams.ativar === '1' ? true : undefined;
  const planoSlug = searchParams.plano?.trim() || undefined;
  const busca = searchParams.q?.trim() || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ contas, total, perPage }, planos] = await Promise.all([
    listarContas({ status, planoSlug, origem, aguardandoAtivacao, busca, page }),
    listarPlanos(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = {
      status,
      plano: planoSlug,
      origem,
      ativar: aguardandoAtivacao ? '1' : undefined,
      q: busca,
      ...patch,
    };
    for (const [key, val] of Object.entries(base)) if (val) p.set(key, val);
    const s = p.toString();
    return s ? `/admin/contas?${s}` : '/admin/contas';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Contas ({total})</h1>
        <NovaContaButton planos={planos.map((p) => ({ slug: p.slug, nome: p.nome }))} />
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap items-center gap-2" action="/admin/contas">
        <input
          type="text"
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome ou e-mail"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? ''} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="plano" defaultValue={planoSlug ?? ''} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">Todos os planos</option>
          {planos.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.nome}
            </option>
          ))}
        </select>
        <select name="origem" defaultValue={origem ?? ''} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">Toda origem</option>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>
              {ORIGEM_LABEL[o]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Filtrar
        </button>
      </form>

      {/* Atalhos rápidos */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/admin/contas?origem=AUTO" className="rounded-full border border-border px-3 py-1 font-semibold text-muted-foreground hover:bg-muted">
          🔎 Entraram direto (pra contatar)
        </Link>
        <Link href="/admin/contas?ativar=1" className="rounded-full border border-border px-3 py-1 font-semibold text-muted-foreground hover:bg-muted">
          💳 Querem ativar plano
        </Link>
        <Link href="/admin/contas?status=TRIAL" className="rounded-full border border-border px-3 py-1 font-semibold text-muted-foreground hover:bg-muted">
          ⏳ Em trial
        </Link>
      </div>

      {/* Lista */}
      {contas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhuma conta encontrada.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {contas.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/contas/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.nome}</span>
                    {c.origem === 'AUTO' && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        entrou direto
                      </span>
                    )}
                    {c.aguardandoAtivacao && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        quer ativar
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="hidden text-muted-foreground sm:inline">{c.planoNome}</span>
                  {c.assentos > 1 && <span className="hidden text-muted-foreground sm:inline">{c.assentos} assentos</span>}
                  <span className="text-muted-foreground">
                    {c.status === 'TRIAL' ? `trial até ${fmtData(c.trialTerminaEm)}` : `expira ${fmtData(c.planoExpiraEm)}`}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_CLASSE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={qs({ page: String(page - 1) })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground opacity-50">← Anterior</span>
          )}
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={qs({ page: String(page + 1) })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
              Próxima →
            </Link>
          ) : (
            <span className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground opacity-50">Próxima →</span>
          )}
        </div>
      )}
    </div>
  );
}
