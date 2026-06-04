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
    // - rotas internas do Next (_next) e da API de auth
    // - qualquer arquivo estático (tem ponto: sw.js, manifest.webmanifest, ícones, favicon)
    // - páginas públicas (/, /login, /auth/*, /sobre)
    '/((?!_next|api/auth|login|auth|sobre|.*\\..*|$).*)',
  ],
};
