import { listarCupons } from '@/lib/cupons';
import { fmtMoney, fmtData } from '../fmt';
import { CuponsUI } from './cupons-ui';

export const dynamic = 'force-dynamic';

export default async function CuponsPage() {
  const cupons = await listarCupons();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Cupons</h1>
      <CuponsUI
        cupons={cupons.map((c) => ({
          id: c.id,
          code: c.code,
          descontoTipo: c.descontoTipo,
          descontoValor: c.descontoValor,
          duracaoTipo: c.duracaoTipo,
          usados: c.usados,
          maxUsos: c.maxUsos,
          validoAte: c.validoAte ? c.validoAte.toISOString() : null,
          ativo: c.ativo,
          descontoLabel: c.descontoTipo === 'PERCENTUAL' ? `${c.descontoValor}%` : fmtMoney(c.descontoValor),
          validoAteLabel: c.validoAte ? fmtData(c.validoAte) : 'sem prazo',
        }))}
      />
    </div>
  );
}
