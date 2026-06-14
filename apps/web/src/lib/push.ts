/**
 * Web Push — envio de notificações do ritual semanal.
 * Chaves VAPID lazy (não quebra build sem env). Inscrições mortas (404/410)
 * são removidas automaticamente do banco.
 */
import webpush from 'web-push';
import { prisma } from '@bussola/db';

let configurado = false;

function getWebPush() {
  if (!configurado) {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:contato@bussoladotempo.com.br';
    if (!pub || !priv) {
      throw new Error('VAPID keys não configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).');
    }
    webpush.setVapidDetails(subject, pub, priv);
    configurado = true;
  }
  return webpush;
}

export function pushHabilitado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // pra onde levar ao clicar
  tag?: string; // colapsa notificações do mesmo tipo
};

/**
 * Envia o payload pra todas as inscrições de um usuário.
 * Retorna quantas chegaram. Limpa inscrições mortas.
 */
export async function enviarPushParaUsuario(userId: string, payload: PushPayload): Promise<number> {
  const wp = getWebPush();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const data = JSON.stringify(payload);
  let entregues = 0;
  const mortas: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await wp.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
        entregues += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          mortas.push(s.id); // endpoint expirou — desinscrever
        } else {
          console.error('[push] falha ao enviar:', status, (err as Error)?.message);
        }
      }
    }),
  );

  if (mortas.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: mortas } } });
  }
  return entregues;
}
