/**
 * Gancho Bússola → TriboCRM: empurra como lead quem "entrou direto"
 * (Google/link mágico, sem passar pelo formulário) pra você trabalhar no CRM.
 *
 * É best-effort e NO-OP enquanto a API não está configurada — basta definir
 * TRIBO_LEAD_API_URL (e TRIBO_LEAD_API_KEY, se a API exigir) no .env pra ligar.
 * Nunca lança erro: criar lead nunca pode quebrar o login do usuário.
 */
export async function enviarLeadParaTribo(lead: {
  nome?: string | null;
  email: string;
  origem?: string;
}): Promise<void> {
  const url = process.env.TRIBO_LEAD_API_URL;
  if (!url) return; // ainda não configurado — não faz nada

  try {
    const key = process.env.TRIBO_LEAD_API_KEY;
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        nome: lead.nome ?? '',
        email: lead.email,
        origem: lead.origem ?? 'bussola-entrou-direto',
        formId: process.env.TRIBO_FORM_ID ?? undefined,
      }),
    });
  } catch (e) {
    console.error('[tribo-lead] falha ao enviar lead (ignorado):', e);
  }
}
