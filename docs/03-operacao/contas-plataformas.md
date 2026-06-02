# 🔐 Checklist de Contas e Plataformas — Bússola do Tempo

> O que criar/cadastrar, quando criar e quanto custa. Organizado por fase pra não fazer tudo de uma vez.

---

## ⚡ ZONA 0 — AGORA (antes mesmo do piloto)

**Total: 2-3 horas de trabalho · Custo: R$ 40-60 (domínio)**

Coisas que **garantem a marca** e **preparam comunicação** com mentorados durante o piloto.

| # | Item | Pra quê | Custo | Como |
|---|---|---|---|---|
| 1 | **Domínio `.com.br`** (registro.br) | Reservar a marca. Ex: `bussoladotempo.com.br`, `bussola.app.br` | R$ 40/ano | [registro.br](https://registro.br) — paga com cartão ou boleto |
| 2 | **Domínio `.com` ou `.app`** (Hostinger, GoDaddy ou Cloudflare) | Reservar a marca globalmente | R$ 60-100/ano | [cloudflare.com](https://cloudflare.com/products/registrar) — mais barato e sem upsell |
| 3 | **Email comercial** (ex: `lucas@bussoladotempo.com.br`) | Comunicação séria com mentorados | Incluso no Google Workspace ou ZohoMail (grátis até 5 contas) | [zoho.com/mail](https://zoho.com/mail) — versão gratuita |
| 4 | **Conta GitHub** (já tem?) | Versionar a planilha + futuros artefatos. Repo privado **bussola-do-tempo** | Grátis | [github.com](https://github.com) |
| 5 | **Figma** (free) | Refinar mockups (designer pode trabalhar depois) | Grátis | [figma.com](https://figma.com) |

**Decisão pendente sua:** qual nome de domínio cravar? Sugestões em ordem de força:
- `bussoladotempo.com.br` ⭐ (recomendo — direto, BR, fácil de falar)
- `bussola.app` (curto, internacional, mas .app custa mais)
- `usebussola.com`

---

## 🧪 ZONA 1 — DURANTE O PILOTO (jun-ago 2026)

**Total: 0-1 hora · Custo: R$ 0**

Você roda piloto **só com a planilha XLSX**. Não precisa de mais nada digital ainda.

Único item opcional pra facilitar o piloto:

| # | Item | Pra quê | Custo |
|---|---|---|---|
| 6 | **Google Drive compartilhado** (já tem com sua conta Google) | Cada mentorado preenche a própria cópia da planilha | Grátis |
| 7 | **WhatsApp Business** (opcional) | Grupo do piloto separado do pessoal | Grátis |
| 8 | **Calendly ou Cal.com** (free) | Agendar as 5-7 entrevistas de dor + reuniões do piloto | Grátis (Cal.com self-hosted ou Calendly até 1 calendário) |

---

## 💻 ZONA 2 — INÍCIO DO DESENVOLVIMENTO (set 2026, Fase 1)

**Total: 4-6 horas (todas as contas) · Custo inicial: R$ 0 (planos free) · Mensal: R$ 0-150 inicialmente**

Só faça depois que **o piloto tiver provado a tese** (5/7 sustentam + 3/7 querem pagar).

### Hospedagem e banco
| # | Item | Pra quê | Custo grátis até | Quando paga |
|---|---|---|---|---|
| 9 | **Vercel** | Hospedagem do frontend + API (Next.js) | 100 GB tráfego/mês, 1 projeto | A partir de $20/mês quando crescer |
| 10 | **Supabase** ⭐ | Banco Postgres + Auth + Storage (tudo em 1) | 500 MB DB, 50k usuários ativos/mês | $25/mês quando crescer |
| 11 | (alternativa) **Neon** | Só banco Postgres se preferir separar | 3 GB DB | $19/mês |

### Repositório e CI/CD
| # | Item | Pra quê | Custo |
|---|---|---|---|
| 12 | **GitHub** (organização privada) | Código-fonte + CI/CD (GitHub Actions inclusos) | Grátis pra repo privado individual |
| 13 | **GitHub Copilot** (opcional) | Aumenta produtividade do dev | $10/mês por dev |

### Monitoramento
| # | Item | Pra quê | Custo grátis até |
|---|---|---|---|
| 14 | **Sentry** | Captura de erros em produção | 5k eventos/mês |
| 15 | **PostHog** | Analytics de produto (signup, retention, eventos) | 1 milhão de eventos/mês |
| 16 | **UptimeRobot** | Monitorar se o site tá online | 50 monitores grátis |

### Design
| # | Item | Pra quê | Custo |
|---|---|---|---|
| 17 | **Figma** (Professional, se contratar designer) | Mockups, design system | $15/mês por usuário (grátis pra solo) |

### Comunicação (se montar squad)
| # | Item | Pra quê | Custo |
|---|---|---|---|
| 18 | **Slack** ou **Discord** | Comunicação do time | Grátis em ambos pra time pequeno |
| 19 | **Linear** ou **Notion** | Gestão de tarefas, sprints, docs | Linear grátis até 250 issues; Notion grátis pessoal |

---

## 💳 ZONA 3 — PRÉ-LANÇAMENTO (out-nov 2026)

**Total: 2-4 horas · Custo: variável (depende da cobrança)**

Cobrança, email transacional, identidade visual final.

### Cobrança recorrente
| # | Item | Pra quê | Taxas |
|---|---|---|---|
| 20 | **Stripe** ⭐ | Pagamentos globais, cartões internacionais, assinatura recorrente | 3,99% + R$0,39 por transação (BR) |
| 21 | (alternativa BR) **Asaas** | Pix + boleto + cartão, mais barato pro BR | 1,99% + R$0,49 (Pix grátis) |
| 22 | (alternativa BR) **Hotmart** | Se quiser vender como infoproduto | 9,9% + R$1,00 |

**Minha recomendação:** Stripe pra cartão recorrente internacional + Asaas pra Pix BR. Combinar os dois cobre o mercado BR + global.

### Email transacional
| # | Item | Pra quê | Custo grátis até |
|---|---|---|---|
| 23 | **Resend** ⭐ | Email de signup, confirmação, recuperação de senha, notificações | 3k emails/mês grátis |
| 24 | (alternativa) **Postmark** | Mesma função, ligeiramente mais caro | 100 emails grátis no trial |

### Marca legal
| # | Item | Pra quê | Custo |
|---|---|---|---|
| 25 | **INPI** (registro de marca BR) | Proteger "Bússola do Tempo" como marca registrada no Brasil | ~R$ 355 por classe (classe 9 = software) |
| 26 | **Marca internacional (WIPO)** | Só se for atacar mercado global | ~$650 USD |

### Identidade visual
| # | Item | Pra quê | Custo |
|---|---|---|---|
| 27 | **Designer freelance** (logo + paleta + tipografia) | Identidade visual profissional | R$ 1.500-5.000 one-time |
| 28 | **Banco de ícones** (Lucide ou Heroicons) | Já open source, grátis | Grátis |

---

## 📈 ZONA 4 — OPERAÇÃO (pós-lançamento)

**Conforme escalar.**

| # | Item | Pra quê | Quando |
|---|---|---|---|
| 29 | **Crisp** ou **Intercom** | Chat de suporte no app | Quando passar de 50 usuários pagantes |
| 30 | **Google Analytics 4** | Tráfego do site marketing | Antes do lançamento |
| 31 | **Mailchimp** ou **Brevo** | Email marketing pra base | Quando começar a fazer conteúdo |
| 32 | **Loops.so** | Email automation pra produto SaaS (alternativa moderna ao Mailchimp) | Quando escalar |
| 33 | **Status page** (BetterStack ou Atlassian) | Comunicar incidentes pro usuário | Após 100+ usuários |

---

## 🔌 ZONA 5 — INTEGRAÇÕES FUTURAS (Fase 2+, 2027)

Só pense nisso quando o produto V1 estiver rodando.

| # | Item | Pra quê |
|---|---|---|
| 34 | **Google Cloud Console** | App OAuth pra integrar Google Calendar |
| 35 | **Microsoft Azure AD** | App OAuth pra Outlook Calendar |
| 36 | **Apple Developer** ($99/ano) | Publicar app iOS na App Store (V4) |
| 37 | **Google Play Console** ($25 one-time) | Publicar app Android na Play Store (V4) |
| 38 | **OneSignal** ou **Web Push** | Notificações push mobile |

---

## 🎯 RESUMO PRÁTICO — O que fazer AGORA (esta semana)

Você não precisa criar tudo de uma vez. Pra hoje/essa semana, **só 4 coisas**:

| ✓ | Ação | Custo | Tempo |
|---|---|---|---|
| ☐ | Comprar `bussoladotempo.com.br` no [registro.br](https://registro.br) | R$ 40/ano | 15 min |
| ☐ | Comprar `bussoladotempo.com` no Cloudflare | R$ 60/ano | 15 min |
| ☐ | Criar email `contato@bussoladotempo.com.br` no ZohoMail | Grátis | 30 min |
| ☐ | Criar repo privado `bussola-do-tempo` no GitHub (pra guardar planilha + spec) | Grátis | 5 min |

**Total: ~1h, ~R$ 100/ano.** Resto fica pra quando o piloto provar a tese.

---

## ⚠️ Cuidados importantes

1. **Não cadastre tudo agora.** Cada conta nova = mais 1 senha pra lembrar, mais 1 painel pra acessar, mais 1 cobrança pra acompanhar. Comece minimalista.

2. **Use gestor de senhas** (1Password, Bitwarden) desde o início pra não enlouquecer.

3. **Crie um email dedicado** (ex: `bussola@gmail.com`) ANTES de criar contas SaaS. Não use seu pessoal — protege contra spam e facilita transferência se contratar dev/PJ no futuro.

4. **Mantenha um arquivo `passwords.md` criptografado** ou planilha protegida com lista de todas as contas + planos + datas de renovação. Senão você vai pagar 3 vezes pelo mesmo serviço sem perceber.

5. **Antes de assinar plano pago de qualquer um**, esgote o plano grátis. A maioria dos serviços nessa lista tem free tier que aguenta os primeiros 100 usuários.

6. **Stripe / Asaas exigem CNPJ**, em geral. Confirma se você vai usar o CNPJ da Doctum, da Tribo, ou abrir um terceiro pra Bússola.

---

## 🧾 Custo total estimado

| Fase | One-time | Mensal recorrente |
|---|---|---|
| Zona 0 (agora) | R$ 100 (domínios) | R$ 0 |
| Zona 1 (piloto) | R$ 0 | R$ 0 |
| Zona 2 (dev V1) | R$ 0 | R$ 0-50 (planos free aguentam) |
| Zona 3 (lançamento) | R$ 2.000-5.000 (designer + INPI) | R$ 100-300 |
| Zona 4 (operação) | — | R$ 200-800/mês conforme escalar |

**Pra rodar o piloto e desenvolver o MVP, você gasta menos de R$ 200 em infra/mês.** O caro vem depois — designer profissional, marketing, marca registrada.
