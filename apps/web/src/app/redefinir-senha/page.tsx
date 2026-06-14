'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Compass, Loader2, CheckCircle2 } from 'lucide-react';

function RedefinirInner() {
  const token = useSearchParams().get('token') ?? '';
  const [senha, setSenha] = React.useState('');
  const [confirma, setConfirma] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirma) {
      setErro('As senhas não conferem.');
      return;
    }
    setBusy(true);
    const r = await fetch('/api/auth/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, senha }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não consegui redefinir.');
      return;
    }
    setOk(true);
  }

  const inp =
    'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary';

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Link inválido. Peça um novo em{' '}
        <Link href="/esqueci-senha" className="font-semibold text-primary hover:underline">
          Esqueci a senha
        </Link>
        .
      </p>
    );
  }

  if (ok) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Senha redefinida!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Já pode entrar com a nova senha.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ir pro login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Criar nova senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha uma senha nova pra sua conta.</p>
      <form onSubmit={submeter} className="mt-6 space-y-4">
        <div>
          <label htmlFor="senha" className="mb-1.5 block text-sm font-semibold">
            Nova senha
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
          disabled={busy || !senha}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar nova senha
        </button>
      </form>
    </>
  );
}

export default function RedefinirSenhaPage() {
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
        <React.Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
          <RedefinirInner />
        </React.Suspense>
      </div>
    </main>
  );
}
