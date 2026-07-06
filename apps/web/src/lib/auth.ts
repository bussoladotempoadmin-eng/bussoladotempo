/**
 * NextAuth configuração
 * - Email magic link via Resend
 * - Persistência via Prisma adapter (users/accounts/tokens)
 * - Sessão em JWT: o middleware de proteção roda no edge (sem banco), então
 *   precisa validar a sessão por JWT, não por sessão no banco.
 */
import type { NextAuthOptions } from 'next-auth';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@bussola/db';
import { sendMagicLinkEmail } from './email';
import { verificarSenha } from './senha';

/**
 * E-mail canônico: minúsculo e sem espaços nas pontas. TODO login (senha, Google
 * ou link mágico) resolve o usuário por ESTE e-mail normalizado — assim o mesmo
 * e-mail sempre abre o MESMO cadastro, sem duplicar por diferença de maiúsculas.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Adapter do Prisma com e-mail normalizado na criação e na busca. É o que garante
 * que provedores diferentes (Google × link mágico) caiam no mesmo User em vez de
 * criar um cadastro duplicado quando o e-mail chega com maiúsculas/espaços.
 */
function adapterEmailNormalizado(): Adapter {
  const base = PrismaAdapter(prisma) as Required<Adapter>;
  return {
    ...base,
    createUser: (data: AdapterUser) =>
      base.createUser({ ...data, email: normalizarEmail(data.email) }),
    getUserByEmail: (email: string) => base.getUserByEmail(normalizarEmail(email)),
  };
}

/** Mapeia o perfil do Google forçando o e-mail normalizado (fecha a ponta OAuth). */
function perfilGoogleNormalizado(profile: GoogleProfile) {
  return {
    id: profile.sub,
    name: profile.name,
    email: normalizarEmail(profile.email),
    image: profile.picture,
  };
}

const providers: NextAuthOptions['providers'] = [
  EmailProvider({
    from: process.env.EMAIL_FROM,
    maxAge: 24 * 60 * 60, // link vale 24h
    async sendVerificationRequest({ identifier, url }) {
      await sendMagicLinkEmail({ to: identifier, magicLink: url });
    },
  }),
  // Login por e-mail + senha.
  CredentialsProvider({
    id: 'credentials',
    name: 'E-mail e senha',
    credentials: {
      email: { label: 'E-mail', type: 'email' },
      senha: { label: 'Senha', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const senha = credentials?.senha;
      if (!email || !senha) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.senhaHash) return null;
      const ok = await verificarSenha(senha, user.senhaHash);
      if (!ok) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

// Google só entra na lista se as credenciais existirem (evita quebrar o
// ambiente local enquanto as chaves não estão configuradas).
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Provider de LOGIN — escopo leve (sem agenda). Mantém o login limpo.
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Mesmo e-mail (verificado pelo magic link e pelo Google) = mesma conta.
      allowDangerousEmailAccountLinking: true,
      profile: perfilGoogleNormalizado,
    }),
  );

  // Provider separado de CONEXÃO DA AGENDA — pedido só quando o usuário clica
  // em "Conectar Google Agenda". Guarda os tokens (com refresh) numa Account
  // com provider='google-calendar', sem precisar mexer no schema.
  providers.push(
    GoogleProvider({
      id: 'google-calendar',
      name: 'Google Calendar',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile: perfilGoogleNormalizado,
      authorization: {
        params: {
          // calendar.events = ler E escrever eventos (Fase C lê, Fase 2 escreve).
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline', // garante refresh_token
          prompt: 'consent', // força tela de consentimento (pra vir o refresh_token)
        },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: adapterEmailNormalizado(),
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
    // No sign-in, guarda o id do usuário e a flag de super admin no token JWT.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { superAdmin: true },
        });
        token.superAdmin = Boolean(dbUser?.superAdmin);
        // Registra o último login (fire-and-forget — nunca quebra o login).
        await prisma.user
          .update({ where: { id: user.id }, data: { ultimoLoginEm: new Date() } })
          .catch(() => {});
      }
      return token;
    },
    // Expõe o id e o super admin no objeto de sessão lido pelas páginas.
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
        session.user.superAdmin = Boolean(token.superAdmin);
      }
      return session;
    },
  },
};
