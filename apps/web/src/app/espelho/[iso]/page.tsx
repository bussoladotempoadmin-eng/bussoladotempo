import { redirect } from 'next/navigation';

// Espelho foi unificado com a Revisão. Mantém o link antigo funcionando.
export default function EspelhoRedirect({ params }: { params: { iso: string } }) {
  redirect(`/revisao/${params.iso}`);
}
