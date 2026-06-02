/**
 * NextAuth configuração
 * - Email magic link via Resend
 * - Persistência via Prisma adapter
 * - Sessão em banco (não JWT)
 */
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from '@bussola/db';
import { sendMagicLinkEmail } from './email';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
