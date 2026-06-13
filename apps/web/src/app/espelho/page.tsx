import { redirect } from 'next/navigation';
import { currentIsoWeek } from '@/lib/semana';

// Espelho foi unificado com a Revisão — redireciona pra revisão da semana atual.
export default function EspelhoIndex() {
  redirect(`/revisao/${currentIsoWeek()}`);
}
