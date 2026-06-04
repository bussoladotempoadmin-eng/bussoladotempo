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
import { prisma } from '@bussola/db';
import { sendMagicLinkEmail } from './email';

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
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60, // link vale 24h
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLinkEmail({ to: identifier, magicLink: url });
      },
    }),
  ],
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
