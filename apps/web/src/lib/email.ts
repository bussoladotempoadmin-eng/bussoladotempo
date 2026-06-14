/**
 * Envio de emails transacionais via Resend.
 * Cliente inicializado lazy pra não bloquear build sem API key.
 */
import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY não configurada. Adicione no .env.local de apps/web.',
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

type MagicLinkParams = {
  to: string;
  magicLink: string;
};

export async function sendMagicLinkEmail({ to, magicLink }: MagicLinkParams) {
  const from = process.env.EMAIL_FROM ?? 'Bússola do Tempo <contato@bussoladotempo.com.br>';
  const resend = getResend();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Seu link de entrada · Bússola do Tempo',
    html: buildHtml(magicLink),
    text: buildText(magicLink),
  });

  if (error) {
    console.error('[email] erro ao enviar magic link:', error);
    throw new Error(`Resend erro: ${error.message}`);
  }
}

export async function sendPasswordResetEmail({ to, link }: { to: string; link: string }) {
  const from = process.env.EMAIL_FROM ?? 'Bússola do Tempo <contato@bussoladotempo.com.br>';
  const resend = getResend();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Redefinir sua senha · Bússola do Tempo',
    html: buildResetHtml(link),
    text: [
      'Bússola do Tempo · redefinir senha',
      '',
      'Você pediu pra redefinir sua senha. Clica no link (vale 1 hora):',
      link,
      '',
      'Se não foi você, pode ignorar — sua senha continua a mesma.',
    ].join('\n'),
  });

  if (error) {
    console.error('[email] erro ao enviar reset de senha:', error);
    throw new Error(`Resend erro: ${error.message}`);
  }
}

function buildResetHtml(link: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Bússola do Tempo</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:40px;">
        <tr><td style="padding-bottom:24px;">
          <div style="display:inline-flex;align-items:center;gap:8px;font-size:20px;font-weight:800;color:#0f172a;">🧭&nbsp;Bússola do Tempo</div>
        </td></tr>
        <tr><td style="font-size:22px;font-weight:700;padding-bottom:12px;">Redefinir sua senha</td></tr>
        <tr><td style="font-size:15px;color:#475569;line-height:1.6;padding-bottom:24px;">
          Você pediu pra trocar sua senha. Clica no botão abaixo — o link vale 1 hora e só funciona uma vez.
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">Criar nova senha</a>
        </td></tr>
        <tr><td style="font-size:13px;color:#94a3b8;padding-bottom:16px;">
          Ou copia esse endereço:<br/><span style="word-break:break-all;color:#3b82f6;">${link}</span>
        </td></tr>
        <tr><td style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;">
          Se não foi você, pode ignorar — sua senha continua a mesma.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildHtml(link: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Bússola do Tempo</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:40px;">
          <tr>
            <td style="padding-bottom:24px;">
              <div style="display:inline-flex;align-items:center;gap:8px;font-size:20px;font-weight:800;color:#0f172a;">
                🧭&nbsp;Bússola do Tempo
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size:22px;font-weight:700;padding-bottom:12px;">
              Seu link de entrada chegou
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;color:#475569;line-height:1.6;padding-bottom:24px;">
              Clica no botão abaixo pra entrar na sua conta. O link vale por 24 horas e só funciona uma vez.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">
                Entrar na Bússola
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#94a3b8;padding-bottom:16px;">
              Ou copia esse endereço no navegador:<br/>
              <span style="word-break:break-all;color:#3b82f6;">${link}</span>
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;">
              Se você não pediu esse link, pode ignorar. Ninguém vai entrar na sua conta sem clicar nele.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function buildText(link: string): string {
  return [
    'Bússola do Tempo · seu link de entrada',
    '',
    'Clica pra entrar (vale 24h, só funciona uma vez):',
    link,
    '',
    'Se você não pediu, pode ignorar.',
  ].join('\n');
}
