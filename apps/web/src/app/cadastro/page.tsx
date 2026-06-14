'use client';

import * as React from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Compass, Loader2 } from 'lucide-react';

export default function CadastroPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [senha, setSenha] = React.useState('');
  const [confirma, setConfirma] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirma) {
      setErro('As senhas não conferem.');
      return;
    }
    setBusy(true);
    const r = await fetch('/api/auth/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui criar a conta.');
      setBusy(false);
      return;
    }
    // Entra na hora.
    const login = await signIn('credentials', { email, senha, redirect: false, callbackUrl });
    setBusy(false);
    if (login?.error) {
      setErro('Conta criada, mas falhou o login. Tente entrar.');
      return;
    }
    window.location.href = callbackUrl;
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

        <h1 className="text-2xl font-extrabold tracking-tight">Criar sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Leva 30 segundos. Você já entra direto.</p>

        <form onSubmit={submeter} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nome" className="mb-1.5 block text-sm font-semibold">
              Seu nome
            </label>
            <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como te chamam" className={inp} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              E-mail
            </label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inp} />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1.5 block text-sm font-semibold">
              Senha
            </label>
            <input id="senha" type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 8 caracteres, com letras e números" className={inp} />
          </div>
          <div>
            <label htmlFor="confirma" className="mb-1.5 block text-sm font-semibold">
              Confirmar senha
            </label>
            <input id="confirma" type="password" autoComplete="new-password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} className={inp} />
          </div>

          {erro && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email || !senha}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Criar conta e entrar
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
