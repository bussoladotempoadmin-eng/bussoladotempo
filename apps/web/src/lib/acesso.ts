/**
 * Gate de acesso (Fase 4b) — corta o uso de contas SUSPENSA/CANCELADA.
 *
 * SEGURANÇA por design:
 *  - Só bloqueia status SUSPENSA ou CANCELADA. Trial/Ativa/Atrasada passam.
 *  - Quem NÃO tem assinatura NUNCA é bloqueado (evita trancar alguém por engano).
 *  - BLOQUEIO_ATIVO é um interruptor de emergência: vira false e tudo libera na hora.
 *
 * Só dá pra chegar em SUSPENSA pelo ciclo de 10 dias de atraso (que o admin
 * controla e reverte marcando uma cobrança como paga). Por isso é seguro ligar.
 */
import { redirect } from 'next/navigation';
import { resolveAssinatura } from './assinatura';

export const BLOQUEIO_ATIVO = true;

/** Retorna o motivo do bloqueio, ou null se a conta pode usar o app. */
export async function contaBloqueada(userId: string): Promise<'SUSPENSA' | 'CANCELADA' | null> {
  if (!BLOQUEIO_ATIVO) return null;
  const a = await resolveAssinatura(userId);
  if (!a) return null; // sem assinatura → nunca bloqueia
  if (a.status === 'SUSPENSA') return 'SUSPENSA';
  if (a.status === 'CANCELADA') return 'CANCELADA';
  return null;
}

/** Para páginas: redireciona pra /conta-suspensa se a conta estiver bloqueada. */
export async function exigirAcesso(userId: string) {
  if (await contaBloqueada(userId)) redirect('/conta-suspensa');
}
