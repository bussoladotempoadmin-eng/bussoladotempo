/**
 * Protege rotas autenticadas — usuário sem sessão é redirecionado pra /login
 * com callbackUrl pra voltar depois.
 *
 * Rotas públicas: /, /login, /auth/*, /api/auth/*
 * Rotas protegidas: todas as outras matched pelo config.
 */
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' },
});

export const config = {
  matcher: [
    // Protege tudo, exceto:
    // - rotas estáticas do Next.js (_next, favicon, etc.)
    // - rotas de auth da API
    // - páginas públicas (/, /login, /auth/*)
    '/((?!_next/static|_next/image|favicon.ico|api/auth|login|auth|$).*)',
  ],
};
