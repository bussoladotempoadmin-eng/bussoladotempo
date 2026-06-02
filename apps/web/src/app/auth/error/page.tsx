import Link from 'next/link';
import { Compass, AlertTriangle } from 'lucide-react';

const errorMap: Record<string, { titulo: string; texto: string }> = {
  Verification: {
    titulo: 'Link expirado ou inválido',
    texto: 'Esse link de entrada já foi usado ou expirou. Pede um novo na tela de login.',
  },
  AccessDenied: {
    titulo: 'Acesso negado',
    texto: 'Sua conta não tem permissão pra entrar aqui.',
  },
  Configuration: {
    titulo: 'Erro de configuração',
    texto: 'Algo está fora do lugar do nosso lado. Tenta de novo em alguns minutos.',
  },
  Default: {
    titulo: 'Algo deu errado',
    texto: 'Não conseguimos te autenticar agora. Tenta de novo.',
  },
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const erroKey = searchParams.error ?? 'Default';
  const erro = errorMap[erroKey] ?? errorMap.Default;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-triade-urgente-soft blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">{erro.titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{erro.texto}</p>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md"
        >
          Voltar pra login
        </Link>
      </div>
    </main>
  );
}
