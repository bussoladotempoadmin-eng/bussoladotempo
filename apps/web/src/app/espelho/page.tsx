import { redirect } from 'next/navigation';
import { currentIsoWeek } from '@/lib/semana';

// /espelho → redireciona pro espelho da semana atual
export default function EspelhoIndex() {
  redirect(`/espelho/${currentIsoWeek()}`);
}
