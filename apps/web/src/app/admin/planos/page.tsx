import { listarPlanos } from '@/lib/admin-billing';
import { fmtMoney } from '../fmt';
import { PlanoEditor } from './plano-editor';

export const dynamic = 'force-dynamic';

export default async function PlanosPage() {
  const planos = await listarPlanos();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Planos</h1>
      <p className="text-sm text-muted-foreground">
        Preços e o que cada plano destrava. Cobrança por ciclo ={' '}
        <span className="font-medium">base + (assentos − incluídos) × preço por assento</span>.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {planos.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{p.nome}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{p.slug}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <Linha k="Mensal (base)" v={fmtMoney(p.precoMensal)} />
              <Linha k="Anual (base)" v={fmtMoney(p.precoAnual)} />
              <Linha k="Por assento" v={fmtMoney(p.precoPorAssento)} />
              <Linha k="Assentos incluídos" v={String(p.assentosIncluidos)} />
              <Linha k="Máx. assentos" v={p.maxAssentos == null ? 'ilimitado' : String(p.maxAssentos)} />
              <Linha k="Gerações IA/mês" v={String(p.geracoesIaMes)} />
              <Linha k="Módulo Time" v={p.moduloTimeAtivo ? 'sim' : 'não'} />
              <Linha k="Módulo Comercial" v={p.moduloComercialAtivo ? 'sim' : 'não'} />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <PlanoEditor
                slug={p.slug}
                inicial={{
                  precoMensal: p.precoMensal,
                  precoAnual: p.precoAnual,
                  precoPorAssento: p.precoPorAssento,
                  geracoesIaMes: p.geracoesIaMes,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
