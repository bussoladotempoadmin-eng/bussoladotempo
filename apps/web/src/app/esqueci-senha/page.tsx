'use client';

import * as React from 'react';
import Link from 'next/link';
import { Compass, Loader2, MailCheck } from 'lucide-react';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [enviado, setEnviado] = React.useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch('/api/auth/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setEnviado(true);
  }

  const inp =
    'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary';

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

        {enviado ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <MailCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Verifique seu e-mail</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se houver uma conta com <b>{email}</b>, enviamos um link pra criar uma senha nova.
              O link vale 1 hora.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
              Voltar pro login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Esqueci a senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Coloca seu e-mail que a gente manda um link pra você criar uma nova.
            </p>
            <form onSubmit={submeter} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                  E-mail
                </label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inp} />
              </div>
              <button
                type="submit"
                disabled={busy || !email}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enviar link
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Lembrou?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
