# 🚀 Fase 5 — Lançamento da Bússola do Tempo

Checklist mestre pra deixar tudo pronto pro público. Legenda:
**👤 Lucas** (você faz) · **🤖 Claude** (eu codo) · **🔗 depende de**

---

## BLOCO 0 — Contas e decisões (destrava o resto)

- [ ] 👤 Comprar domínio **bussoladotempo.com.br** (Registro.br, ~R$40/ano) — *em andamento*
- [ ] 👤 Criar conta no **Resend** (já existe) e confirmar acesso ao DNS do domínio
- [ ] 👤+🤖 Decidir o **gateway de pagamento** (ver Bloco 6) — Pix/boleto pesam aqui
- [ ] 👤 Definir **preços** dos 3 pacotes (só Tempo / Completo / só Comercial)
- [ ] (opcional) 👤 Criar conta no **Brevo** — só se quiser campanhas de marketing

---

## BLOCO 1 — Domínio + infraestrutura  🔗 Bloco 0

- [ ] 👤+🤖 Apontar o domínio na **Vercel** (adicionar domínio no projeto)
- [ ] 👤 Criar os registros **DNS** no Registro.br (A/CNAME que a Vercel indicar)
- [ ] 🤖 Atualizar `NEXTAUTH_URL` e `metadataBase` pra `https://bussoladotempo.com.br`
- [ ] 🤖 Ajustar `manifest.ts` (start_url, og:image) pro domínio
- [ ] ✅ Verificar HTTPS válido (a Vercel emite o certificado sozinha)

---

## BLOCO 2 — Páginas públicas e legais  🔗 pode começar já

- [ ] 🤖 **Home pública** de verdade (hoje é "em construção") — proposta de valor, os 3 pacotes, CTA de cadastro
- [ ] 🤖 Página **/privacidade** (LGPD: que dados coleta, pra quê, como apagar)
- [ ] 🤖 Página **/termos** de uso
- [ ] 🤖 Aviso de **cookies/privacidade** simples (LGPD)
- [ ] ✅ Confirmar que já dá pra **excluir a conta** (já existe em /perfil)
- [ ] 🤖 SEO básico: title/description, og:image, `robots.txt`, `sitemap`

---

## BLOCO 3 — Login e senha (maior peça de código)  🔗 pode começar já

- [ ] 🤖 Schema: adicionar `senhaHash` ao User + migration
- [ ] 🤖 **Cadastro** com e-mail + senha (hash com bcrypt)
- [ ] 🤖 **Login** com senha, convivendo com Google e link mágico (NextAuth Credentials)
- [ ] 🤖 **"Esqueci a senha"**: gera token, envia e-mail, tela de redefinir (token expira)
- [ ] 🤖 Validação de força de senha + mensagens claras
- [ ] 🤖 **Rate limit** nas rotas de auth (anti força-bruta)
- [ ] 🤖 Verificação de e-mail no cadastro (confirma que o e-mail é real)

---

## BLOCO 4 — E-mail  🔗 Bloco 1 (domínio)

### Transacional (Resend) — obrigatório pro lançamento
- [ ] 👤+🤖 **Verificar o domínio no Resend** (registros DKIM/SPF no DNS)
- [ ] 🤖 Trocar `EMAIL_FROM` pra `contato@bussoladotempo.com.br`
- [ ] 🤖 Trocar `VAPID_SUBJECT` pro e-mail do domínio (TODO já marcado)
- [ ] 🤖 Adicionar **DMARC** no DNS (entregabilidade)
- [ ] 🤖 Templates: redefinir senha, recibo de compra, boas-vindas

### Marketing (Brevo) — OPCIONAL, pós-lançamento
- [ ] (opcional) 👤 Verificar domínio no Brevo também
- [ ] (opcional) 🤖 Integrar Brevo pra campanhas/sequência de boas-vindas

---

## BLOCO 5 — Verificação OAuth do Google  🔗 Blocos 1 e 2

- [ ] 👤 No Google Cloud: adicionar o **domínio** e os **redirect URIs** de produção
- [ ] 👤+🤖 Preencher a **tela de consentimento** (logo, política de privacidade, domínio)
- [ ] 👤 **Submeter pra verificação** (remove o aviso "app não verificado")
- [ ] ⏳ Aguardar aprovação do Google (pode levar dias)

---

## BLOCO 6 — Planos e cobrança  🔗 Bloco 0 (decisão do gateway)

### Decisão (Bloco 0)
- Gateway: **Mercado Pago / Asaas / Pagar.me** (Pix + boleto + cartão) ou **Stripe** (mais cartão)
- Modelo dos 3 pacotes + preço + se tem teste grátis

### Construção
- [ ] 🤖 Modelo de **assinatura** no banco (plano, status, validade) + migration
- [ ] 🤖 **Entitlements**: ligar/desligar módulos pelo plano (já temos a base do `comercialAtivo`)
- [ ] 🤖 **Checkout** + retorno de pagamento
- [ ] 🤖 **Webhook** do gateway (confirma pagamento, renova/cancela)
- [ ] 🤖 Cobrança **por assento** no time (per-seat) quando aplicável
- [ ] 🤖 Tela "Meu plano / assinatura" (ver status, trocar, cancelar)
- [ ] 🤖 **Onboarding "só Comercial"**: não forçar criar frentes da agenda pessoal

---

## BLOCO 7 — Segurança e higiene  🔗 antes de abrir ao público

- [ ] 👤+🤖 **Rotacionar chaves expostas** (Anthropic + token GitHub) — adiado lá atrás
- [ ] 🤖 Rate limit geral nas APIs sensíveis
- [ ] 🤖 Revisar permissões/escopos (quem vê o quê) com olhar de produção
- [ ] ✅ Confirmar backups do Supabase ligados

---

## BLOCO 8 — Pré-lançamento (qualidade)

- [ ] 🤖 (opcional) **Analytics** (Vercel Analytics ou Plausible)
- [ ] 🤖 (opcional) **Monitor de erros** (Sentry)
- [ ] 🤖+👤 **Teste ponta a ponta**: cadastro → pagamento → login → redefinir senha → usar app
- [ ] 👤 Teste com 1–2 pessoas reais do time (beta)

---

## BLOCO 9 — Go-live

- [ ] 🤖 Atirar o `git push` final + deploy de produção
- [ ] 👤 Anunciar pro time / primeiros clientes
- [ ] 🤖 Acompanhar logs/erros nas primeiras horas

---

## Ordem recomendada (caminho crítico)

1. **👤 Comprar domínio** (em andamento) — destrava Blocos 1, 4, 5
2. **🤖 Em paralelo, sem esperar:** Bloco 3 (login/senha) + Bloco 2 (páginas públicas)
3. **Domínio no ar:** Bloco 1 → Bloco 4 (Resend) → Bloco 5 (Google)
4. **Decidir gateway →** Bloco 6 (cobrança)
5. **Antes de abrir:** Bloco 7 (segurança) → Bloco 8 (testes) → Bloco 9 (go-live)

**Próximo passo do Claude:** começar o **Bloco 3 (login e senha)** agora, enquanto o domínio propaga.
