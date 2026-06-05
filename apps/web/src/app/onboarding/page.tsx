import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { currentIsoWeek } from '@/lib/semana';
import { OnboardingWizard, type WizardWorkspace } from './onboarding-wizard';

export const metadata = { title: 'Boas-vindas · Bússola do Tempo' };

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/onboarding');

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect('/login');

  const ws: WizardWorkspace = {
    nome: workspace.nome,
    timezone: workspace.timezone,
    semanaInicio: workspace.semanaInicio,
    horaAcordar: workspace.horaAcordar,
    horaDormir: workspace.horaDormir,
    horaAlmocoIni: workspace.horaAlmocoIni,
    horaAlmocoFim: workspace.horaAlmocoFim,
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <OnboardingWizard
        primeiroNome={session.user.name?.split(' ')[0] ?? ''}
        workspace={ws}
        semanaIso={currentIsoWeek()}
      />
    </main>
  );
}
