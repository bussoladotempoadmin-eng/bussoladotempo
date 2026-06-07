/**
 * NextAuth configuração
 * - Email magic link via Resend
 * - Persistência via Prisma adapter (users/accounts/tokens)
 * - Sessão em JWT: o middleware de proteção roda no edge (sem banco), então
 *   precisa validar a sessão por JWT, não por sessão no banco.
 */
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@bussola/db';
import { sendMagicLinkEmail } from './email';

const providers: NextAuthOptions['providers'] = [
  EmailProvider({
    from: process.env.EMAIL_FROM,
    maxAge: 24 * 60 * 60, // link vale 24h
    async sendVerificationRequest({ identifier, url }) {
      await sendMagicLinkEmail({ to: identifier, magicLink: url });
    },
  }),
];

// Google só entra na lista se as credenciais existirem (evita quebrar o
// ambiente local enquanto as chaves não estão configuradas).
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Mesmo e-mail (verificado pelo magic link e pelo Google) = mesma conta.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  providers,
  callbacks: {
    // No sign-in, guarda o id do usuário no token JWT.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Expõe o id no objeto de sessão lido pelas páginas.
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
