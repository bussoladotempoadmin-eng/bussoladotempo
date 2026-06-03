import { redirect } from 'next/navigation';
import { currentIsoWeek } from '@/lib/semana';

// /semana → redireciona pra semana atual
export default function SemanaIndex() {
  redirect(`/semana/${currentIsoWeek()}`);
}
