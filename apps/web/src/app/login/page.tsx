'use client';

import * as React from 'react';
import Link from 'next/link';
import { signIn, getProviders } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Compass, Mail, Lock, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = React.useState('');
  const [senha, setSenha] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [hasGoogle, setHasGoogle] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(
    errorParam ? mapError(errorParam) : null,
  );

  React.useEffect(() => {
    getProviders()
      .then((p) => setHasGoogle(Boolean(p?.google)))
      .catch(() => {});
  }, []);

  async function entrarComSenha(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const result = await signIn('credentials', { email, senha, callbackUrl, redirect: false });
    setSubmitting(false);
    if (result?.error) {
      setErrorMsg('E-mail ou senha incorretos.');
    } else {
      window.location.href = callbackUrl;
    }
  }

  async function enviarLinkMagico() {
    if (!email) {
      setErrorMsg('Digite seu e-mail pra receber o link.');
      return;
    }
    setErrorMsg(null);
    setLinkBusy(true);
    const result = await signIn('email', { email, callbackUrl, redirect: false });
    setLinkBusy(false);
    if (result?.error) {
      setErrorMsg(mapError(result.error));
    } else {
      window.location.href = '/auth/verify';
    }
  }

  const inp =
    'w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-frente-doctum-soft blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-frente-tribo-soft blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Compass className="h-6 w-6 text-primary" />
            <span>Bússola do Tempo</span>
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Entrar na sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Com e-mail e senha, Google, ou um link mágico no e-mail.
        </p>

        {hasGoogle && (
          <>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl })}
              className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:bg-muted"
            >
              <GoogleIcon className="h-4 w-4" />
              Entrar com Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={entrarComSenha} className={hasGoogle ? 'space-y-4' : 'mt-6 space-y-4'}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              E-mail
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
                className={inp}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="senha" className="text-sm font-semibold">
                Senha
              </label>
              <Link href="/esqueci-senha" className="text-xs font-semibold text-primary hover:underline">
                Esqueci a senha
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="sua senha"
                className={inp}
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
            disabled={submitting || !email || !senha}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          sem senha?
          <span className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={enviarLinkMagico}
          disabled={linkBusy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-all hover:bg-muted disabled:opacity-50"
        >
          {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Receber link mágico por e-mail
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/cadastro" className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16Z"
      />
    </svg>
  );
}

function mapError(code: string): string {
  const map: Record<string, string> = {
    EmailSignin: 'Não conseguimos enviar o e-mail. Tente de novo em alguns segundos.',
    CredentialsSignin: 'E-mail ou senha incorretos.',
    OAuthSignin: 'Falha ao iniciar login com o Google.',
    OAuthCallback: 'Falha ao voltar do Google. Tenta de novo.',
    OAuthAccountNotLinked: 'Esse e-mail já entrou por outro método. Use o mesmo de antes.',
    Verification: 'O link expirou ou já foi usado. Pede um novo.',
    AccessDenied: 'Você não tem acesso a essa conta.',
    Default: 'Algo deu errado. Tenta de novo.',
  };
  return map[code] ?? map.Default;
}
