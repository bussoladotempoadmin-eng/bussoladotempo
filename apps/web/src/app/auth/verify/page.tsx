import Link from 'next/link';
import { Compass, Mail } from 'lucide-react';

export default function VerifyPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-frente-doctum-soft blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-frente-tribo-soft blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Confere seu email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mandamos um link mágico pra você. Clica nele e você entra automaticamente.
          <br />
          <br />
          O link vale por <strong>24 horas</strong> e só funciona uma vez.
        </p>

        <p className="mt-8 text-xs text-muted-foreground">
          Não chegou em 1 minuto? Confere a pasta de spam ou{' '}
          <Link href="/login" className="text-primary underline">
            tenta de novo
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
