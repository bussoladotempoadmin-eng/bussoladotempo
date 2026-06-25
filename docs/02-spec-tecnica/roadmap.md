# 🛠️ Roadmap de Construção — Bússola do Tempo

> Sequência operacional pra eu (Claude) construir o app aqui, sessão por sessão.
> **Status:** Fase 0 (validação) cumprida em 02/06/2026 (5/7 sustentaram, 3/7 pagariam). Liberado pra Fase 1.

---

## 📋 Estrutura

15 etapas. Cada etapa = uma "sessão" no bloco Gestão Operacional da agenda padrão (ter 14h30-17h ou sáb 8h-13h). Ao fim de cada etapa, você tem **algo rodando localmente** + **commit no git**.

---

## ETAPA 0 — Preparação (VOCÊ, em paralelo, esta semana)

**Tempo seu:** 1-2 horas, fora de bloco de desenvolvimento.
**Custo:** R$ 100/ano (domínios).

### Tarefas suas
- [ ] Criar conta GitHub (se ainda não tem)
- [ ] Criar conta Vercel (free) — login com GitHub
- [ ] Criar conta Supabase (free) — login com GitHub
- [ ] Comprar `bussoladotempo.com.br` (registro.br) e `bussoladotempo.com` (Cloudflare)
- [ ] Criar projeto vazio Supabase chamado `bussola-do-tempo-dev` e guardar a connection string (Settings → Database → Connection string)
- [ ] Me trazer as 3 senhas/strings quando começar Etapa 1:
  - Connection string Supabase DEV (`postgresql://...`)
  - Username GitHub
  - Conta Vercel pronta

**Não precisa de mais nada da Zona 0/2 nessa etapa.** O resto vamos criando conforme precisa.

---

## ETAPA 1 — Setup do monorepo (sessão 1, ~2h)

**Pré-requisito:** Etapa 0 completa.

### O que eu faço
1. Criar pasta `bussola-do-tempo/` na sua máquina
2. Iniciar git + repo no GitHub
3. Setup monorepo com pnpm workspaces:
   ```
   bussola-do-tempo/
   ├── apps/
   │   └── web/              # Next.js 14
   ├── packages/
   │   ├── db/               # Prisma
   │   ├── domain/           # Lógica de negócio
   │   └── ui/               # Componentes compartilhados
   ├── package.json
   └── pnpm-workspace.yaml
   ```
4. Setup Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
5. Configurar ESLint + Prettier + Husky (pre-commit hooks)
6. Página `/` com tema claro/escuro funcionando
7. Commit inicial + push pro GitHub

### Entrega
- Repo público (ou privado) `bussola-do-tempo`
- `pnpm dev` roda local em `localhost:3000`
- Página inicial estilo "Bússola do Tempo · em construção" funcionando

### Como você valida
Abre o link local no navegador, vê a página, troca o tema.

---

## ETAPA 2 — Modelo de dados + Prisma (sessão 2, ~1h30)

### O que eu faço
1. Setup `packages/db` com Prisma
2. Criar `schema.prisma` completo (todo o modelo da §6 da spec)
3. Conectar com Supabase (sua connection string DEV)
4. Rodar primeira migração: `prisma migrate dev --name init`
5. Criar seed com o **caso Lucas pré-preenchido** (4 frentes, ~24 blocos da semana padrão)
6. `prisma studio` pra você ver o banco no navegador

### Entrega
- Banco Supabase com todas as tabelas
- Dados de exemplo (você consegue ver no Prisma Studio)
- Tipos TypeScript gerados automaticamente

---

## ETAPA 3 — Autenticação (sessão 3, ~2h)

### O que eu faço
1. Instalar NextAuth.js + adapter Prisma
2. Configurar provider Email magic link (sem senha) + provider Google OAuth
3. Páginas `/login`, `/signup`, `/logout`
4. Middleware de proteção pras rotas autenticadas
5. Componente `<UserMenu />` no header

### Entrega
- Você cria sua conta com email
- Recebe link no email, clica, está logado
- Suas frentes/blocos seed ficam associadas à sua conta

**Pré-requisito:** uma conta no Resend (free) pra envio do magic link. Te aviso quando chegarmos aqui.

---

## ETAPA 4 — CRUD de Frentes (sessão 4, ~2h)

### O que eu faço
1. Rota API `GET/POST/PATCH/DELETE /api/frentes`
2. Página `/frentes` com lista + formulário inline
3. Drag-and-drop pra reordenar (lib: @dnd-kit)
4. Validação Zod compartilhada front/back

### Entrega
Você consegue adicionar/editar/remover frentes pela UI. Suas 4 frentes (Trabalho Operacional, Gestão Operacional, Agenda externa, Reuniões) já vêm do seed.

---

## ETAPA 5 — CRUD de Compromissos Fixos (sessão 5, ~1h30)

### O que eu faço
1. Rota API `/api/compromissos`
2. Página `/compromissos` com tabela editável
3. UI: dia da semana, hora início, hora fim, descrição, frente, categoria
4. Validações (hora fim > início, etc.)

### Entrega
Compromissos da agenda padrão (treino, mentoria, live) cadastrados.

---

## ETAPA 6 — Algoritmo `AgendaSuggester` (sessão 6, ~3h)

### O que eu faço
1. Implementar `packages/domain/AgendaSuggester` (lógica da §9.1 da spec)
2. Testes unitários (Vitest) cobrindo:
   - Caso Lucas (4 frentes, 59h, 2 compromissos)
   - Caso single frente
   - Caso 0 frentes
   - Caso compromissos cobrindo dia inteiro
3. Rota API `POST /api/semanas/:iso/sugerir-agenda`
4. Página `/agenda-padrao` com grid visual semanal

### Entrega
Você clica "Gerar agenda padrão" → vê o grid preenchido → arrasta pra ajustar.

---

## ETAPA 7 — CRUD de Blocos da Semana (sessão 7, ~2h)

### O que eu faço
1. Rota API `/api/blocos`
2. Página `/semana/[iso]` com edição inline
3. UI: tabela igual à da planilha Excel mas mais bonita
4. Cores condicionais por frente e categoria
5. Drop-down validados

### Entrega
Equivalente da aba "Blocos" da planilha XLSX, mas online + sincronizado + multi-device.

---

## ETAPA 8 — Espelho (matriz Frente × Categoria) (sessão 8, ~2h30)

### O que eu faço
1. Implementar `packages/domain/EspelhoCalculator` (lógica da §9.2)
2. Testes unitários
3. Rota API `GET /api/semanas/:iso/espelho`
4. Página `/espelho/[iso]` com:
   - Matriz visual
   - Summary bar (totais)
   - Comparativo planejado vs realizado
   - Top 3 desvios
   - Cards estilo mockup HTML

### Entrega
Espelho idêntico ao mockup. Mude um bloco → matriz atualiza em < 200ms.

---

## ETAPA 9 — Engine de Insights (Coach Gentil) (sessão 9, ~3h)

### O que eu faço
1. Implementar `packages/domain/InsightEngine` (lógica da §9.3)
2. 15 regras V1 com 3-4 variações de template cada
3. Testes unitários
4. Rota API `GET /api/semanas/:iso/insights`
5. UI dos insights na página `/espelho/[iso]`

### Entrega
Insights gerados automaticamente conforme dados da semana, com linguagem humana.

---

## ETAPA 10 — Revisão Semanal (sessão 10, ~2h)

### O que eu faço
1. Rota API CRUD `/api/semanas/:iso/revisao`
2. Página `/revisao/[iso]` com fluxo guiado em 4 passos:
   - Espelho da semana que passou
   - Top 3 desvios + insights
   - 4 perguntas livres
   - Encadeia pra planejamento da próxima
3. Definir 3 prioridades da próxima semana

### Entrega
Fluxo completo de domingo 18h funcionando.

---

## ETAPA 11 — Painel do Dia (sessão 11, ~2h)

### O que eu faço
1. Página `/` (logado) = painel da manhã
2. Mostra 3 prioridades da semana
3. Lista blocos do dia
4. Indicador "agora" baseado em hora
5. Quick actions

### Entrega
Tela equivalente à Tela 3 do mockup HTML.

---

## ETAPA 12 — Swipe rápido (registrar realizado) (sessão 12, ~1h30)

### O que eu faço
1. Rota API `PATCH /api/blocos/:id/realizado`
2. UI: ao clicar num bloco, abre modal com 4 opções (sim/urgente/disperso/depois)
3. Otimistic update (UI muda na hora)
4. Auto-close em 60s = "sim"

### Entrega
Tela 4 do mockup funcionando.

---

## ETAPA 13 — Fechamento da noite (sessão 13, ~1h30)

### O que eu faço
1. Página `/noite`
2. Resumo do dia (planejado vs realizado)
3. 2 campos livres + rating 1-5
4. Salva como anotação do dia

### Entrega
Ritual de 2 min antes de dormir.

---

## ETAPA 14 — PWA + tema + polimento (sessão 14, ~2h)

### O que eu faço
1. Setup next-pwa (instalável no celular)
2. Toggle claro/escuro persistente (já feito desde Etapa 1, refinar)
3. Manifesto + ícones
4. Splash screen
5. Service worker pra offline básico

### Entrega
Você instala no celular (Adicionar à tela inicial). Funciona offline pra ler agenda.

---

## ETAPA 15 — Testes + Deploy + Domínio (sessão 15, ~3h)

### O que eu faço
1. Suite de testes E2E Playwright (6 fluxos críticos)
2. Lighthouse score > 90 em todas as páginas
3. Setup deploy automático Vercel (push pra `main` = deploy)
4. Configurar variáveis de ambiente em produção
5. Conectar `bussoladotempo.com.br` ao Vercel
6. Migrar DB pra Supabase produção (separado do dev)
7. Página marketing simples em `/sobre`

### Entrega
**App rodando em `https://bussoladotempo.com.br`.** Você acessa, faz login, usa.

---

## 📊 Cronograma sugerido (8-12 semanas)

| Semana | Etapas | Marco |
|---|---|---|
| W1 (08-14/06) | Etapa 0 (você) + Etapas 1, 2 | Setup pronto |
| W2 (15-21/06) | Etapas 3, 4 | Auth + Frentes |
| W3 (22-28/06) | Etapas 5, 6 | Compromissos + Algoritmo |
| W4 (29/06-05/07) | Etapas 7, 8 | Blocos + Espelho |
| W5 (06-12/07) | Etapas 9, 10 | Insights + Revisão |
| W6 (13-19/07) | Etapas 11, 12 | Painel + Swipe |
| W7 (20-26/07) | Etapa 13 + 14 | Noite + PWA |
| W8-9 (27/07-09/08) | Etapa 15 + buffer | Testes + Deploy |

**Marco final:** **lançamento beta fechado em 10/08/2026** (~2 meses).

Depois disso, você abre pros 7 mentorados do piloto começarem a usar o app de verdade (não mais a planilha). Eles viram seus primeiros users beta.

---

## 🚦 Regras do jogo

1. **1 sessão = 1 etapa** (ou parte de uma se for grande). Não pular ordem.
2. **Ao fim de cada sessão:** commit + push + arquivo `PROGRESSO.md` atualizado.
3. **Se uma etapa ficar travada** (algo que só você pode resolver — conta, dinheiro, decisão): páro e te aviso.
4. **Sessões acontecem nos blocos Gestão Operacional da sua agenda padrão** (ter 14h30-17h, sáb 8h-13h, eventualmente outras tardes Gestão Operacional).
5. **Não vamos invadir Trabalho Operacional** pra "adiantar" dev. O preço de adiantar é o mesmo de antes.

---

## ❓ Próximos passos imediatos

1. **Hoje/amanhã (você):** rodar a Etapa 0 — criar contas + comprar domínios + me trazer as credenciais.
2. **Próximo bloco Gestão Operacional agendado** (terça 03/06 14h30 ou sábado 06/06 8h): **Etapa 1 — setup do monorepo.**
3. **Lembre-se:** a agenda padrão começa segunda 08/06. Próxima semana inteira já vai estar registrando blocos reais. Sua revisão semanal de 14/06 já vai ter dados do Caso 0 expandidos.
