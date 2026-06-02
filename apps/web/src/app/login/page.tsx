'use client';

import * as React from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Compass, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(
    errorParam ? mapError(errorParam) : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const result = await signIn('email', { email, callbackUrl, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      setErrorMsg(mapError(result.error));
    } else if (result?.url) {
      window.location.href = '/auth/verify';
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-frente-doctum-soft blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-frente-tribo-soft blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>

        <h1 className="text-2xl font-extrabold tracking-tight">Entrar na sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vamos te mandar um link mágico no email. Sem senha, sem confusão.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              Seu email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar link mágico'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os termos de uso da Bússola do Tempo.
        </p>
      </div>
    </main>
  );
}

function mapError(code: string): string {
  const map: Record<string, string> = {
    EmailSignin: 'Não conseguimos enviar o email. Tente de novo em alguns segundos.',
    OAuthSignin: 'Falha ao iniciar login com provider externo.',
    Verification: 'O link expirou ou já foi usado. Pede um novo.',
    AccessDenied: 'Você não tem acesso a essa conta.',
    Default: 'Algo deu errado. Tenta de novo.',
  };
  return map[code] ?? map.Default;
}
