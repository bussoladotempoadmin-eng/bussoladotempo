import { redirect } from 'next/navigation';
import { currentIsoWeek } from '@/lib/semana';

// /revisao → redireciona pra revisão da semana atual
export default function RevisaoIndex() {
  redirect(`/revisao/${currentIsoWeek()}`);
}
