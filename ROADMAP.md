# Bússola do Tempo — Roadmap mestre

Ordem pensada pra **não quebrar o que já funciona**: estabilizar → fechar o
individual → time → lançar. Fazer um item por vez, testando antes de seguir.

Legenda: 👤 = ação do Lucas · 🤖 = eu construo · ✅ = feito

---

## ✅ JÁ TEMOS (individual)
- [x] MVP + calendário (Mês / Semana / Dia)
- [x] Login com Google (Fase B)
- [x] Conectar Google Agenda — leitura (Fase C)
- [x] Blocos da Bússola → Google — escrita/sync (Fase 2)
- [x] Agenda Padrão inteligente (IA) + refinos (cérebro, cold start, mês, insights)
- [x] Tela unificada Espelho + Revisão (cockpit da semana)
- [x] Comando combinado "Revisar & Planejar com a IA"
- [x] Editar/adicionar blocos na proposta

---

## FASE 0 — Estabilizar o que está pronto (ANTES de tudo)
- [ ] 👤 `git push origin main` (subir todos os commits pendentes)
- [ ] 👤 `ANTHROPIC_API_KEY` na Vercel (Production) + **Redeploy**
- [ ] 👤 Google Cloud com escopo `calendar.events` + **reconectar** a agenda
- [ ] 👤 Testar em produção: tela unificada, Revisar & Planejar, editar/add proposta, "Enviar pro Google"
- [ ] 👤 Confirmar que nada quebrou

## FASE 1 — Fechar a Camada 1 (o "assistente")
- [ ] 🤖 Passo 3 — cache da IA + limite **1x/semana** (ver grátis, gerar limitado; sem limite pro Lucas testar)
- [ ] 🤖 Passo 4 — janela (sex–dom + graça segunda) + **trava** ao concluir + **nudges in-app** (banners no momento certo)
- [ ] 👤 Testar

## FASE 2 — Polimento rápido
- [ ] 🤖 Suavizar o "W" (mostrar datas amigáveis pro usuário; ISO por baixo)
- [ ] 🤖 (opcional) Unificar "Coach Gentil" × "Análise da IA"
- [ ] 🤖 Pequenos ajustes de UX que surgirem

## FASE 3 — Higiene de segurança (rápido, quando quiser)
- [ ] 👤 Rotacionar token do GitHub (gerar novo, apagar o exposto)
- [ ] 👤 Rotacionar chave Anthropic (nova → atualizar local + Vercel → apagar a antiga)

## FASE 4 — Módulo de Time (a nova estratégia) — em passos seguros
**4.1 Modelo de dados (aditivo)**
- [ ] 🤖 Organização/Time + Membros + Papéis (diretor / líder)
- [ ] 👤 Aplicar a migração na Supabase (sem mexer no que existe)

**4.2 Permissões**
- [ ] 🤖 Camada "quem vê o quê" (diretor vê os do time; líder só o seu)
- [ ] 🤖 Reflexões + "como me senti" SEMPRE privados (pilar da honestidade)

**4.3 Convidar líderes (piloto, sem depender de domínio)**
- [ ] 👤 Adicionar os 7 como usuários de teste no Google
- [ ] 🤖 Fluxo de convite/aceite + vínculo ao time

**4.4 Painel do Time (a tela do mockup)**
- [ ] 🤖 Resumo do time + distribuição Importante/Urgente/Disperso
- [ ] 🤖 Lista de líderes (horas, barrinha, status, foco)
- [ ] 🤖 Clicar no líder → Espelho individual dele (só leitura)

**4.5 Coach, não comando**
- [ ] 🤖 Ação "Sugerir" (sugestão que o líder aceita) — sem editar a agenda dele

**4.6 IA do Time (premium)**
- [ ] 🤖 Análise agregada do time

- [ ] 👤 **Piloto real com os 7 líderes** + coletar feedback

## FASE 5 — Lançamento / Negócio (pra abrir além do piloto)
- [ ] 👤 Comprar domínio `bussoladotempo.com.br`
- [ ] 🤖 Política de privacidade + home pública
- [ ] 👤 Verificação OAuth do Google (tira o aviso "app não verificado")
- [ ] 👤 Resend com domínio (e-mail pra qualquer usuário)
- [ ] 🤖 Cadastro + login por **e-mail e senha** (criptografada) + "esqueci a senha"
      — convivendo com Google e link mágico; melhora o onboarding do time
- [ ] 🤖+👤 Planos + cobrança (per-seat pro time)

## FASE 6 — Notificações (Camada 2 — "avisa com app fechado")
- [ ] 🤖 Push (Vercel Cron + VAPID + permissão)
- [ ] 🤖 E-mail (depois do domínio) — lembretes sex/dom/segunda
- [ ] Liga em cima da lógica de janela já feita na Fase 1

---

### Por que essa ordem
1. **Fase 0** primeiro: não construir em cima de coisa não testada.
2. **Individual sólido (1–2)** antes do time: os líderes vão USAR a experiência individual.
3. **Time (4)** pode ser **pilotado antes do lançamento** usando "usuários de teste" do Google — não precisa do domínio pra validar com os 7.
4. **Lançamento (5)** quando for abrir pro mundo. **Notificações (6)** por cima da lógica que a Fase 1 já cria.
