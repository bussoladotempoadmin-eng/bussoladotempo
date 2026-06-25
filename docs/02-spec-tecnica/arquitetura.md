# 📐 Bússola do Tempo — Especificação Técnica para Desenvolvimento

> **Documento canônico** pra implementação do produto.
> **Audiência:** squad AIOX (PM, Architect, Dev, QA, UX) ou time de desenvolvimento.
> **Versão:** V2 / 25-05-2026 · Autor: Lucas Silveira (Gestão Operacional) com Claude.
> **Status:** pronto pra entrada em desenvolvimento, condicionado a validação de tese via piloto artesanal.

---

## 📋 ÍNDICE

1. [Brief executivo](#1-brief-executivo)
2. [Personas e casos de uso](#2-personas-e-casos-de-uso)
3. [Glossário do domínio](#3-glossário-do-domínio)
4. [Arquitetura geral](#4-arquitetura-geral)
5. [Stack técnico recomendado](#5-stack-técnico-recomendado)
6. [Modelo de dados](#6-modelo-de-dados)
7. [Contratos de API](#7-contratos-de-api)
8. [Funcionalidades — épicos e histórias](#8-funcionalidades--épicos-e-histórias)
9. [Lógica de negócio crítica](#9-lógica-de-negócio-crítica)
10. [UX e fluxos](#10-ux-e-fluxos)
11. [Roadmap por fases (MVP → V3)](#11-roadmap-por-fases)
12. [Requisitos não-funcionais](#12-requisitos-não-funcionais)
13. [Estratégia de testes (QA)](#13-estratégia-de-testes-qa)
14. [Riscos técnicos](#14-riscos-técnicos)
15. [Anexos e referências](#15-anexos-e-referências)

---

## 1. BRIEF EXECUTIVO

### Para o agente PM

**Produto:** Bússola do Tempo — sistema de gestão de tempo que cruza **Frentes de trabalho** com **Categorias da Bússola** (Importante / Urgente / Disperso), entregando ao usuário o "Espelho semanal" — quanto do tempo foi pra cada combinação.

**Problema central:**
> "Tenho controle do que precisa ser feito, mas a semana sempre escapa porque urgências dos outros vencem minhas prioridades — e eu não consigo ver onde meu tempo de fato foi."

**Promessa de valor:**
> "Em 4 semanas você vai SABER, com números, quanto do seu tempo vai pra cada frente e em qual categoria da Bússola. E vai começar a mudar o que decide proteger."

**Diferencial competitivo:**
Nenhum app no mercado (Motion, Sunsama, Reclaim.ai, Akiflow, Amie, Routine) cruza os dois eixos **Frente × Categoria** com relatório semanal comparativo (planejado vs realizado).

**Público-alvo V1:**
- Donos de negócio / empresários com múltiplas frentes simultâneas
- Profissionais sênior multi-projeto (consultores, advogados, médicos com vários consultórios)
- Faixa: 30-50 anos, renda alta, já pagam por mentoria/cursos

**Métricas de sucesso V1 (6 meses pós-lançamento):**
- 100 usuários pagantes (R$ 49-99/mês)
- 70% de retenção 4 semanas após signup
- NPS ≥ 50
- 60% dos usuários ativos preenchem revisão semanal nos domingos

**Quem não é público V1:**
- Estudantes / pessoas em CLT pura sem flexibilidade
- Usuários casuais de produtividade (público amplo)

---

## 2. PERSONAS E CASOS DE USO

### Persona primária — "Lucas Diretor"
- 35-45 anos, dono ou diretor de negócio
- Toca 3-5 frentes ao mesmo tempo (CLT executivo + projetos próprios + assessorias)
- Tem flexibilidade pra montar a própria agenda
- Vive sobrecarregado por urgências alheias
- Já tentou várias ferramentas (Notion, calendário, planner) e abandonou
- Disposto a pagar por algo que entregue clareza

**Casos de uso prioritários:**
| ID | Caso de uso | Frequência |
|---|---|---|
| UC-1 | Configurar frentes e orçamento de horas (setup inicial) | 1x na instalação |
| UC-2 | Planejar a semana (domingo 18h) | 1x/semana |
| UC-3 | Conferir blocos do dia (manhã) | 5-6x/semana |
| UC-4 | Registrar como cada bloco foi (swipe rápido) | 5-10x/dia |
| UC-5 | Fazer fechamento da noite | 5-6x/semana |
| UC-6 | Ver o Espelho semanal (revisão domingo) | 1x/semana |
| UC-7 | Adaptar agenda quando algo invade (reunião nova) | 2-5x/semana |

### Persona secundária — "Coach Mentor" (V3)
- Conduz mentoria pra outros donos de negócio
- Quer acompanhar evolução dos mentorados ao longo do programa
- Caso de uso: dashboard agregado de N usuários sob sua orientação

---

## 3. GLOSSÁRIO DO DOMÍNIO

Termos que aparecem no produto. **Usar exatamente esses termos no código e na UI.**

| Termo | Definição |
|---|---|
| **Frente** | Área de trabalho do usuário (ex: Trabalho Operacional, Gestão Operacional, Cliente X). Tem orçamento de horas/semana. |
| **Bloco** | Janela de tempo na agenda, com início, fim, frente associada, tarefa nomeada e classificação. |
| **Categoria** | Classificação do bloco na Bússola do Tempo. Valores: `IMPORTANTE`, `URGENTE`, `DISPERSO`. |
| **Bússola do Tempo** | Nome do framework conceitual (não usar "Tríade do Tempo" — marca de terceiro). |
| **Importante** | Bloco estratégico, alinhado com objetivos, gera resultado. |
| **Urgente** | Bloco com prazo apertado. Pode ou não ser Importante. |
| **Disperso** | Bloco que parece trabalho mas não gera resultado nem tem prazo (reuniões inúteis, mensagens). |
| **Compromisso fixo** | Evento recorrente da semana (ex: treino seg-sex 7h-8h, live qui 18h-21h). |
| **Agenda padrão** | Template semanal gerado no setup, base de cada semana real. |
| **Semana** | Unidade de planejamento. Usa formato ISO 8601 (ex: `2026-W24`). |
| **Planejado** | Categoria atribuída ao bloco na fase de planejamento (domingo). |
| **Realizado** | Categoria registrada pelo usuário depois (durante ou no fim da semana). |
| **Desvio** | Bloco onde Planejado ≠ Realizado. |
| **Espelho** | Visão da matriz Frente × Categoria com dados reais da semana. |
| **Insight** | Texto gerado automaticamente pelo Coach Gentil com base em regras. |
| **Coach Gentil** | Identidade da "voz" do sistema. Linguagem humana, não corporativa, sem ser invasiva. |
| **Revisão semanal** | Ritual de domingo 18h. Inclui ver o Espelho + planejar próxima semana. |
| **Orçamento** | Horas/semana alocadas pelo usuário a uma frente. Não é teto duro — é referência. |

---

## 4. ARQUITETURA GERAL

### Para o agente Architect

### Princípios arquiteturais
1. **Mobile-first.** Maior parte do uso é no celular (painel da manhã, swipe entre blocos). Desktop secundário.
2. **Offline-tolerant.** Painel do dia e blocos da semana devem funcionar offline. Sync quando voltar online.
3. **Reativo.** Toda mudança em bloco recalcula matriz e insights em tempo real (≤ 200ms).
4. **Single-tenant V1, multi-tenant prepared.** Cada usuário tem o próprio workspace. Schema preparado pra multi-workspace na V3.
5. **API first.** Backend expõe API REST/JSON. Frontend web e (futuro) mobile consomem a mesma API.

### Diagrama de alto nível

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTES                                  │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Web (PWA)   │    │ Mobile (V2)  │    │ Coach Panel  │  │
│  │  Next.js     │    │ React Native │    │   (V3)       │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
└─────────┼───────────────────┼───────────────────┼──────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                       HTTPS / JWT Auth
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    BACKEND (API)                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js API Routes (ou Node/Express)                  │ │
│  │  - Auth · Frentes · Blocos · Espelho · Insights       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Layer (lógica de domínio)                     │ │
│  │  - AgendaSuggester · EspelhoCalculator · InsightEngine │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Prisma ORM                                            │ │
│  └─────────────────────────┬──────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │   PostgreSQL        │
                  │   (Supabase / Neon) │
                  └──────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼────┐  ┌─────▼─────┐
       │   Storage   │ │  Auth   │  │ Realtime  │
       │  (futuro)   │ │ Service │  │  (V2+)    │
       └─────────────┘ └─────────┘  └───────────┘

         INTEGRAÇÕES (V2+)
              │
       ┌──────┴──────┬──────────┬──────────┐
       │             │          │          │
   Google Cal    Outlook    Webhooks   Push API
```

### Camadas

- **Apresentação (Frontend):** UI, navegação, estado local, otimistic updates, PWA offline.
- **API (Backend):** validação, autenticação, autorização, orquestração.
- **Serviços (Domain):** AgendaSuggester, EspelhoCalculator, InsightEngine, ConflictDetector.
- **Persistência:** Prisma ORM sobre PostgreSQL.
- **Integrações externas (V2+):** Google Calendar API, Outlook Graph API, Push notifications.

---

## 5. STACK TÉCNICO RECOMENDADO

### Frontend
- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (componentes acessíveis prontos)
- **Estado:** Zustand (leve, sem boilerplate) ou TanStack Query pra estado servidor
- **Forms:** react-hook-form + Zod (validação)
- **Datas:** date-fns
- **Gráficos:** recharts (matriz com visualização)
- **PWA:** next-pwa

### Backend
- **Opção A (recomendada):** Next.js API Routes (full-stack) — menos infra
- **Opção B:** Node.js + Express/Fastify separado — mais flexibilidade
- **ORM:** Prisma
- **Validação:** Zod (compartilhado com frontend)
- **Auth:** NextAuth.js (compatível com Next) ou Supabase Auth
- **Jobs:** BullMQ (Redis) pra notificações push e geração de insights

### Database
- **Principal:** PostgreSQL (Supabase, Neon ou Railway)
- **Cache (V2):** Redis pra sessões e jobs

### Infra
- **Hospedagem frontend:** Vercel
- **Banco:** Supabase (Postgres + Auth + Storage gratuito até certo limite)
- **Monitoramento:** Sentry (errors) + PostHog (analytics produto)
- **Email transacional (V2):** Resend ou Postmark

### Mobile
- **V1:** PWA (HTML responsivo). Tela inicial adicionável ao celular.
- **V2:** React Native + Expo (compartilha lógica via packages monorepo)

### Justificativa do stack
- **Por que Next.js full-stack:** time pequeno, deploy rápido em Vercel, type-safe end-to-end com Prisma + tRPC opcional.
- **Por que Postgres:** queries relacionais complexas (matriz é múltiplos joins), suporte excelente do Prisma.
- **Por que PWA primeiro:** validar antes de investir em React Native, todas as funcionalidades V1 cabem em web mobile.

---

## 6. MODELO DE DADOS

### Para o agente Architect / Data Engineer

### Diagrama ER (simplificado)

```
User (1) ──── (N) Workspace (1) ──── (N) Frente
                  │                       │
                  │ (1)                   │
                  ├─── (N) CompromissoFixo
                  ├─── (N) SemanaPlano
                  │           │
                  │           ├─── (N) Bloco ──── (N..1) Frente
                  │           ├─── (1) Revisao
                  │           └─── (N) Insight
                  │
                  └─── (1) WorkspaceSettings
```

### Schema Prisma

```prisma
// schema.prisma

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime      @default(now())
  workspaces    Workspace[]
  accounts      Account[]
  sessions      Session[]
}

model Workspace {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id])
  nome            String              @default("Meu workspace")
  timezone        String              @default("America/Sao_Paulo")
  semanaInicio    SemanaInicio        @default(DOMINGO)  // dia da semana de início
  horaAcordar     String              @default("06:00")
  horaDormir      String              @default("22:30")
  horaAlmocoIni   String              @default("12:00")
  horaAlmocoFim   String              @default("13:30")
  frentes         Frente[]
  compromissos    CompromissoFixo[]
  semanas         SemanaPlano[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

enum SemanaInicio {
  DOMINGO
  SEGUNDA
}

model Frente {
  id              String      @id @default(cuid())
  workspaceId     String
  workspace       Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  nome            String
  icone           String      @default("📌")  // emoji
  cor             String      @default("#3b82f6")  // hex
  orcamentoHoras  Float       @default(0)
  ordem           Int         @default(0)
  ativa           Boolean     @default(true)
  blocos          Bloco[]
  compromissos    CompromissoFixo[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([workspaceId])
}

model CompromissoFixo {
  id              String      @id @default(cuid())
  workspaceId     String
  workspace       Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  diaSemana       DiaSemana
  horaInicio      String      // "HH:mm"
  horaFim         String      // "HH:mm"
  descricao       String
  frenteId        String?
  frente          Frente?     @relation(fields: [frenteId], references: [id], onDelete: SetNull)
  categoria       Categoria   @default(IMPORTANTE)
  createdAt       DateTime    @default(now())

  @@index([workspaceId])
}

enum DiaSemana {
  SEG
  TER
  QUA
  QUI
  SEX
  SAB
  DOM
}

enum Categoria {
  IMPORTANTE
  URGENTE
  DISPERSO
}

model SemanaPlano {
  id              String          @id @default(cuid())
  workspaceId     String
  workspace       Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  semanaIso       String          // ex: "2026-W24"
  status          StatusSemana    @default(PLANEJANDO)
  blocos          Bloco[]
  revisao         Revisao?
  insights        Insight[]
  prioridade1     String?
  prioridade2     String?
  prioridade3     String?
  riscoSemana     String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([workspaceId, semanaIso])
  @@index([workspaceId])
}

enum StatusSemana {
  PLANEJANDO      // em planejamento (antes de começar)
  ATIVA           // semana corrente
  REVISAO         // domingo, em revisão
  FECHADA         // arquivada
}

model Bloco {
  id                  String       @id @default(cuid())
  semanaPlanoId       String
  semanaPlano         SemanaPlano  @relation(fields: [semanaPlanoId], references: [id], onDelete: Cascade)
  frenteId            String
  frente              Frente       @relation(fields: [frenteId], references: [id])
  diaSemana           DiaSemana
  horaInicio          String       // "HH:mm"
  horaFim             String       // "HH:mm"
  tarefa              String       @db.Text
  categoriaPlanejada  Categoria
  categoriaRealizada  Categoria
  motivoDesvio        String?
  prioridadeSemana    Int?         // 1, 2, 3 ou null
  invadido            Boolean      @default(false)
  fonteOrigem         FonteOrigem  @default(MANUAL)
  externalEventId     String?      // id do Google Calendar quando importado
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  @@index([semanaPlanoId])
  @@index([frenteId])
}

enum FonteOrigem {
  MANUAL
  AGENDA_PADRAO    // gerado pelo Sistema Sugerir
  CALENDAR_IMPORT  // V2: importado do Google Calendar
}

model Revisao {
  id              String       @id @default(cuid())
  semanaPlanoId   String       @unique
  semanaPlano     SemanaPlano  @relation(fields: [semanaPlanoId], references: [id], onDelete: Cascade)
  retroFuncionou  String?      @db.Text
  retroNaoFuncionou String?    @db.Text
  retroMudanca    String?      @db.Text
  sensacaoMedia   Int?         // 1-5
  fechadaEm       DateTime?
  createdAt       DateTime     @default(now())
}

model Insight {
  id              String       @id @default(cuid())
  semanaPlanoId   String
  semanaPlano     SemanaPlano  @relation(fields: [semanaPlanoId], references: [id], onDelete: Cascade)
  tipo            TipoInsight
  titulo          String
  texto           String       @db.Text
  frenteId        String?      // opcional, quando o insight é sobre uma frente
  geradoEm        DateTime     @default(now())

  @@index([semanaPlanoId])
}

enum TipoInsight {
  GOOD
  WARN
  TIP
  NEUTRAL
}
```

### Notas de modelagem
- **Cascade delete** em todas as relações pra cleanup automático ao remover workspace.
- **Strings de hora** como "HH:mm" — simples, sem fuso horário (workspace tem o fuso).
- **`semanaIso`** unique por workspace — evita duplicação.
- **`fonteOrigem`** preparado pra integração com Calendar (V2).
- **`Insight`** persistido (não recalculado a cada request) — gera 1x na revisão, exibe muitas vezes.

---

## 7. CONTRATOS DE API

### Para o agente Dev

Padrão REST/JSON. Auth via JWT no header `Authorization: Bearer <token>`. Validação com Zod.

### Endpoints

#### Auth
```
POST   /api/auth/signup     { email, password, name }       → { user, token }
POST   /api/auth/login      { email, password }              → { user, token }
POST   /api/auth/logout                                      → 204
GET    /api/auth/me                                          → { user }
```

#### Workspace
```
GET    /api/workspace                                        → { workspace }
PATCH  /api/workspace       { nome?, timezone?, horaAcordar?, horaDormir?, ... }  → { workspace }
```

#### Frentes
```
GET    /api/frentes                                          → { frentes: Frente[] }
POST   /api/frentes         { nome, icone?, cor?, orcamentoHoras }  → { frente }
PATCH  /api/frentes/:id     { nome?, icone?, cor?, orcamentoHoras?, ordem?, ativa? }  → { frente }
DELETE /api/frentes/:id                                      → 204
```

#### Compromissos fixos
```
GET    /api/compromissos                                     → { compromissos: CompromissoFixo[] }
POST   /api/compromissos    { diaSemana, horaInicio, horaFim, descricao, frenteId?, categoria }  → { compromisso }
PATCH  /api/compromissos/:id                                 → { compromisso }
DELETE /api/compromissos/:id                                 → 204
```

#### Semanas e blocos
```
GET    /api/semanas/:semanaIso                               → { semana, blocos, revisao? }
POST   /api/semanas/:semanaIso/sugerir-agenda                → { blocos[] }  -- gera agenda padrão
POST   /api/semanas/:semanaIso/blocos      { diaSemana, horaInicio, horaFim, frenteId, tarefa, categoriaPlanejada }  → { bloco }
PATCH  /api/blocos/:id                                       → { bloco }
PATCH  /api/blocos/:id/realizado    { categoriaRealizada, motivoDesvio? }  → { bloco }
PATCH  /api/blocos/:id/invadir                               → { bloco }    -- marca como invadido
DELETE /api/blocos/:id                                       → 204
```

#### Espelho e insights
```
GET    /api/semanas/:semanaIso/espelho                       → { matriz, totais, percentuais, comparativo }
GET    /api/semanas/:semanaIso/insights                      → { insights: Insight[] }
POST   /api/semanas/:semanaIso/insights/gerar                → { insights[] }  -- força regeneração
```

#### Revisão semanal
```
GET    /api/semanas/:semanaIso/revisao                       → { revisao }
PUT    /api/semanas/:semanaIso/revisao    { retroFuncionou, retroNaoFuncionou, retroMudanca, sensacaoMedia, prioridade1, prioridade2, prioridade3, riscoSemana }  → { revisao }
```

#### Conflitos e sugestões (V2)
```
POST   /api/conflitos/detectar     { evento: { dataHoraInicio, dataHoraFim, descricao } }  → { conflitos, sugestoes }
POST   /api/blocos/:id/realocar    { para: { diaSemana, horaInicio } }                     → { bloco }
```

### Exemplo de payload do `/api/semanas/:semanaIso/espelho`

```json
{
  "semanaIso": "2026-W24",
  "matriz": {
    "IMPORTANTE": { "doctum_id": 8, "tribo_id": 10, "bruna_id": 1, "cuidaja_id": 0 },
    "URGENTE":    { "doctum_id": 22, "tribo_id": 5, "bruna_id": 1, "cuidaja_id": 2 },
    "DISPERSO":   { "doctum_id": 6, "tribo_id": 3, "bruna_id": 0.5, "cuidaja_id": 0.5 }
  },
  "totais": {
    "porFrente":   { "doctum_id": 36, "tribo_id": 18, "bruna_id": 2.5, "cuidaja_id": 2.5 },
    "porCategoria": { "IMPORTANTE": 19, "URGENTE": 30, "DISPERSO": 10 },
    "geral": 59
  },
  "percentuais": {
    "porCategoria": { "IMPORTANTE": 0.32, "URGENTE": 0.51, "DISPERSO": 0.17 }
  },
  "comparativo": {
    "planejadoVsRealizado": {
      "IMPORTANTE": { "planejado": 0.47, "realizado": 0.32, "delta": -0.15 },
      "URGENTE":    { "planejado": 0.41, "realizado": 0.51, "delta": +0.10 },
      "DISPERSO":   { "planejado": 0.12, "realizado": 0.17, "delta": +0.05 }
    }
  },
  "topDesvios": [
    { "blocoId": "...", "diaSemana": "QUI", "horaInicio": "13:30", "horaFim": "15:00", "frente": "Gestão Operacional", "planejada": "IMPORTANTE", "realizada": "URGENTE", "motivoDesvio": "Reunião emergencial CEO" }
  ]
}
```

---

## 8. FUNCIONALIDADES — ÉPICOS E HISTÓRIAS

### Para o agente Dev / PO

Notação: cada história tem **ID**, **Como/Quero/Para**, **Critérios de Aceitação (CA)** e **Definição de Pronto (DoD)**.

### ÉPICO 1 — Onboarding e Setup
> Usuário entra pela primeira vez, configura suas frentes e gera a agenda padrão.

**H1.1 — Cadastro / Login**
- *Como* novo usuário, *quero* criar conta com email e senha, *para* acessar o app.
- **CA:**
  - Email válido, senha mínima 8 caracteres com 1 número.
  - Confirmação de email via link (V2 opcional na V1).
  - Erro claro se email já existe.
- **DoD:** testes unitários e e2e do fluxo, hash de senha com bcrypt, JWT com expiração 7 dias.

**H1.2 — Cadastrar frentes**
- *Como* novo usuário logado, *quero* cadastrar minhas frentes de trabalho com orçamento de horas/semana, *para* o sistema saber meu mix de atividades.
- **CA:**
  - Mínimo 1, máximo 8 frentes na V1.
  - Cada frente: nome (obrigatório), ícone (emoji, default 📌), cor (color picker, default azul), orçamento horas/sem (float ≥ 0).
  - Soma de orçamentos não bloqueia, mas mostra alerta se > 70h.
  - Drag-and-drop pra reordenar.
- **DoD:** API + UI + testes.

**H1.3 — Cadastrar compromissos fixos**
- *Como* usuário, *quero* registrar meus compromissos recorrentes (treino, lives, reuniões fixas), *para* o sistema respeitá-los ao sugerir agenda.
- **CA:**
  - Cada compromisso: dia da semana, hora início, hora fim, descrição, frente associada (opcional), categoria default.
  - Permite múltiplos por dia.
- **DoD:** API + UI.

**H1.4 — Gerar agenda padrão sugerida**
- *Como* usuário, *quero* que o sistema gere uma agenda padrão semanal distribuindo minhas frentes nos slots livres, *para* eu começar a usar sem montar do zero.
- **CA:**
  - Algoritmo respeita compromissos fixos.
  - Algoritmo respeita âncoras (sono, almoço).
  - Distribui orçamento de horas proporcionalmente entre dias.
  - Permite usuário arrastar/editar antes de confirmar.
- **DoD:** unit tests do algoritmo + UI de visualização tipo grid semanal.

### ÉPICO 2 — Planejamento da Semana (Momento 2)
> Domingo 18h: usuário transforma agenda padrão em semana real.

**H2.1 — Visualizar agenda da próxima semana**
- *Como* usuário, *quero* ver a agenda da próxima semana pré-preenchida pela agenda padrão, *para* não começar do zero todo domingo.
- **CA:** ao acessar `/semanas/2026-W24`, se não existir, cria com base na agenda padrão.

**H2.2 — Editar blocos da semana**
- *Como* usuário, *quero* editar nome, frente, horário e classificação de cada bloco, *para* refletir o que a semana real vai ser.
- **CA:**
  - Inline editing.
  - Validação: hora fim > hora início.
  - Conflito de blocos no mesmo horário gera aviso (não bloqueia).

**H2.3 — Definir 3 prioridades da semana**
- *Como* usuário, *quero* marcar 3 blocos como prioridades da semana, *para* destacá-los no painel diário e no Espelho.
- **CA:**
  - Exatamente 3 prioridades (1, 2, 3) — não mais, não menos.
  - Visíveis com selo ⭐ na agenda.

### ÉPICO 3 — Uso Diário (Momento 3)
> Manhã + durante o dia + noite.

**H3.1 — Painel da manhã**
- *Como* usuário, *quero* ver as 3 prioridades da semana + os blocos do dia atual, *para* saber o que importa hoje em 2 minutos.
- **CA:**
  - Carrega em ≤ 1s.
  - Funciona offline (cache).
  - Mostra hora atual com indicador.

**H3.2 — Swipe rápido entre blocos**
- *Como* usuário, *quero* registrar (em ≤ 2 segundos) como cada bloco foi (Importante / Urgente / Disperso), *para* o Espelho refletir a realidade.
- **CA:**
  - Aparece automaticamente ao fim do bloco (notificação push V2; web só ao abrir o app V1).
  - 4 opções: confirmar planejado, marcar Urgente, marcar Disperso, "depois".
  - Sem confirmação extra — clicou, salvou.
  - Default em 60s sem ação: confirma planejado.

**H3.3 — Fechamento da noite**
- *Como* usuário, *quero* fazer um fechamento de 2 min à noite, *para* registrar entrega, pendência e sensação do dia.
- **CA:**
  - Mostra resumo planejado vs realizado do dia.
  - 2 campos livres curtos: entreguei / ficou aberto.
  - Sensação 1-5 estrelas.

### ÉPICO 4 — O Espelho (Momento 4)
> Domingo 18h-18h30: revisão semanal.

**H4.1 — Matriz Frente × Categoria**
- *Como* usuário, *quero* ver o cruzamento entre frentes e categorias da Bússola na semana que passou, *para* entender onde meu tempo realmente foi.
- **CA:**
  - Tabela visual com linhas (3 categorias) × colunas (frentes) + totais.
  - Cada célula mostra horas + percentual da frente.
  - Comparativo planejado vs realizado em destaque.

**H4.2 — Top 3 desvios**
- *Como* usuário, *quero* ver os 3 blocos que mais mudaram entre planejado e realizado, *para* identificar onde minha semana escapou.
- **CA:**
  - Lista ordenada por duração do desvio.
  - Mostra: dia/hora, frente, planejado → realizado, motivo registrado (se existir).

**H4.3 — Insights do Coach Gentil**
- *Como* usuário, *quero* receber 4-8 insights automáticos sobre minha semana em linguagem humana, *para* entender padrões sem ler tabelas.
- **CA:**
  - Insights gerados a partir das regras definidas em [§9.3](#93-engine-de-insights-coach-gentil).
  - Tom não-invasivo, sem moralismo.
  - Tipo (good / warn / tip / neutral) define cor visual.

**H4.4 — Roteiro guiado da revisão**
- *Como* usuário, *quero* responder 4 perguntas curtas pra fechar a semana, *para* ter aprendizado registrado.
- **CA:**
  - 4 campos livres: o que funcionou / o que não funcionou / mudança pra próxima / risco da próxima.
  - Encadeia direto pra planejamento da próxima semana.

### ÉPICO 5 — Adaptação (Momento 5)
> Imprevistos durante a semana.

**H5.1 — Marcar bloco como invadido**
- *Como* usuário, *quero* marcar o bloco atual como invadido com 1 clique, *para* o sistema registrar que algo urgente atropelou.
- **CA:** botão flutuante; ao clicar, bloco vira `Urgente` + flag `invadido=true`.

**H5.2 — (V2) Detecção de conflito de calendário**
- *Como* usuário com Google Calendar integrado, *quero* que o app me avise quando uma reunião nova choca com bloco protegido.
- **CA (V2):** webhook do Google Calendar dispara verificação. Notificação push com opções de remarcar.

**H5.3 — (V2) Sugestão de realocação**
- *Como* usuário cujo bloco protegido foi invadido, *quero* sugestões de onde mover, *para* manter orçamento de horas da frente.
- **CA (V2):** retorna 2-3 slots livres na semana que cabem na duração do bloco.

### ÉPICO 6 — Configurações e perfil
**H6.1** — Editar perfil (nome, foto, email).
**H6.2** — Editar timezone, horas de sono, almoço.
**H6.3** — Exportar dados (JSON, CSV).
**H6.4** — Deletar conta (LGPD compliance).

---

## 9. LÓGICA DE NEGÓCIO CRÍTICA

### Para o agente Dev / Architect

### 9.1 Algoritmo de Sugestão de Agenda Padrão (`AgendaSuggester`)

**Input:**
- `frentes: [{ id, orcamentoHoras, ordem }]`
- `compromissosFixos: [{ diaSemana, horaInicio, horaFim, frenteId?, categoria }]`
- `workspace: { horaAcordar, horaDormir, horaAlmocoIni, horaAlmocoFim, semanaInicio }`

**Output:** `blocos: [{ diaSemana, horaInicio, horaFim, frenteId, tarefa: "Bloco genérico", categoriaPlanejada: IMPORTANTE }]`

**Algoritmo (V1 — heurístico simples):**

```
1. Definir janelas disponíveis por dia da semana:
   - manhã: [horaAcordar + 1h, horaAlmocoIni]
   - tarde: [horaAlmocoFim, horaDormir - 30min]

2. Subtrair compromissos fixos das janelas disponíveis (split em sub-janelas).

3. Para cada frente em ordem de prioridade (campo `ordem`):
   - Calcular horas alvo por dia útil: orcamentoHoras / 5 (ou 6 se incluir sábado).
   - Distribuir nos sub-blocos disponíveis, preferindo:
     a) Manhãs (deep work = melhor horário cognitivo).
     b) Blocos contíguos > blocos fragmentados.
     c) Distribuir entre dias (evitar concentrar).

4. Aplicar regras de protecão:
   - Sábado por padrão: livre, exceto se houver compromisso fixo.
   - Domingo: livre (revisão semanal 18h não conta como bloco).

5. Marcar categoriaPlanejada = IMPORTANTE como default.
```

**Casos de borda:**
- Se soma de orçamentos > horas disponíveis: avisar usuário, gerar até esgotar slots.
- Se uma frente tem 0h: não gera blocos.
- Se compromisso fixo > janela disponível: aceita (sobrepõe).

**Testes obrigatórios:**
- Caso Lucas (4 frentes, 59h, 2 compromissos noturnos) → gera distribuição validada.
- Caso single frente 40h → distribui em 5 dias úteis.
- Caso 0 frentes → array vazio.
- Caso compromissos que cobrem todo dia → gera só fora deles.

### 9.2 Cálculo do Espelho (`EspelhoCalculator`)

```pseudo
function calcEspelho(semanaPlanoId):
  blocos = fetchBlocos(semanaPlanoId)
  frentes = fetchFrentes(workspaceDo(semanaPlanoId))

  matriz = {}
  for categoria in [IMPORTANTE, URGENTE, DISPERSO]:
    matriz[categoria] = {}
    for frente in frentes:
      matriz[categoria][frente.id] = sum(
        b.duracaoHoras for b in blocos
        if b.frenteId == frente.id and b.categoriaRealizada == categoria
      )

  totalPorFrente = { f.id: sum por frente }
  totalPorCategoria = { cat: sum por categoria }
  totalGeral = sum total

  percentuaisPorCategoria = { cat: total / totalGeral }

  comparativo = {}
  for categoria in [IMPORTANTE, URGENTE, DISPERSO]:
    plan = sum(b.duracao for b in blocos if b.categoriaPlanejada == categoria) / totalGeral
    real = totalPorCategoria[categoria] / totalGeral
    comparativo[categoria] = { planejado: plan, realizado: real, delta: real - plan }

  topDesvios = blocos
    .filter(b => b.categoriaPlanejada != b.categoriaRealizada)
    .sort(by duração DESC)
    .take(3)

  return { matriz, totalPorFrente, totalPorCategoria, totalGeral, percentuais, comparativo, topDesvios }
```

**Performance:** matriz deve calcular em < 100ms pra semana com 50 blocos. Considerar cache na resposta com TTL de 60s.

### 9.3 Engine de Insights (Coach Gentil)

Regras condicionais com templates de texto. Cada regra retorna `null` ou `Insight`.

```javascript
const regras = [
  // Tríade global
  {
    nome: 'imp_alto',
    aplica: ({ percentuais }) => percentuais.IMPORTANTE >= 0.5,
    insight: ({ percentuais }) => ({
      tipo: 'GOOD',
      titulo: '✅ Você viveu em Importante',
      texto: `${(percentuais.IMPORTANTE*100).toFixed(0)}% da sua semana foi Importante. Esse é o sinal de uma semana onde estratégia venceu reatividade. Mantenha o ritmo.`
    })
  },
  {
    nome: 'imp_baixo',
    aplica: ({ percentuais }) => percentuais.IMPORTANTE < 0.3,
    insight: ({ percentuais }) => ({
      tipo: 'WARN',
      titulo: '⚠️ Pouco tempo em Importante',
      texto: `Apenas ${(percentuais.IMPORTANTE*100).toFixed(0)}% da semana foi Importante. Sua estratégia está perdendo pra urgência alheia. Vale revisar o que está protegendo deep work.`
    })
  },
  {
    nome: 'bombeiro',
    aplica: ({ percentuais }) => percentuais.URGENTE >= 0.5,
    insight: ({ percentuais }) => ({
      tipo: 'WARN',
      titulo: '🔥 Semana de bombeiro',
      texto: `${(percentuais.URGENTE*100).toFixed(0)}% Urgente. Você está reagindo, não decidindo. Olhe quais frentes mais consumiram Urgente — provavelmente dá pra delegar ou redesenhar pipeline.`
    })
  },
  {
    nome: 'disperso_alto',
    aplica: ({ percentuais, totalDisperso }) => percentuais.DISPERSO >= 0.2,
    insight: ({ percentuais, totalDisperso }) => ({
      tipo: 'WARN',
      titulo: '💨 Disperso alto',
      texto: `${(percentuais.DISPERSO*100).toFixed(0)}% Disperso = ${totalDisperso.toFixed(1)}h de coisa que pareceu trabalho mas não gerou resultado. Vale cortar reuniões/mensagens sem propósito.`
    })
  },
  // Por frente
  {
    nome: 'frente_bombeiro',
    porFrente: true,
    aplica: ({ frente, matriz, totalFrente }) =>
      totalFrente > 0 && (matriz.URGENTE[frente.id] / totalFrente) >= 0.6,
    insight: ({ frente, matriz, totalFrente }) => ({
      tipo: 'WARN',
      titulo: `⚠️ ${frente.icone} ${frente.nome} virou bombeiro`,
      texto: `${((matriz.URGENTE[frente.id] / totalFrente)*100).toFixed(0)}% Urgente nessa frente. Vale pensar em delegar, redesenhar pipeline de demanda ou aceitar conscientemente que essa é sua frente reativa.`
    })
  },
  {
    nome: 'frente_protegida',
    porFrente: true,
    aplica: ({ frente, matriz, totalFrente }) =>
      totalFrente > 0 && (matriz.IMPORTANTE[frente.id] / totalFrente) >= 0.7,
    insight: ({ frente, matriz, totalFrente }) => ({
      tipo: 'GOOD',
      titulo: `🎯 ${frente.icone} ${frente.nome} bem protegida`,
      texto: `${((matriz.IMPORTANTE[frente.id] / totalFrente)*100).toFixed(0)}% Importante. Você está investindo bem nessa frente — onde provavelmente está seu maior ROI estratégico.`
    })
  },
  // Comparativo planejado vs realizado
  {
    nome: 'planejado_imp_caiu',
    aplica: ({ comparativo }) => comparativo.IMPORTANTE.delta <= -0.08,
    insight: ({ comparativo }) => ({
      tipo: 'WARN',
      titulo: '📉 Planejou mais Importante do que executou',
      texto: `Planejou ${(comparativo.IMPORTANTE.planejado*100).toFixed(0)}% Importante, executou ${(comparativo.IMPORTANTE.realizado*100).toFixed(0)}%. Identifique os blocos que viraram outra coisa — é onde sua semana está vazando.`
    })
  }
  // ... outras regras
];
```

**Total de regras V1:** 15-20 regras. Lista completa em separado (anexo de dados).

**Princípios de tom:**
- Nunca culpar.
- Sempre dar próximo passo concreto.
- Variar templates pra não soar robótico (3-4 variações por regra).
- Português brasileiro coloquial mas profissional.

### 9.4 Detector de Conflito (V2)

```pseudo
function detectarConflito(novoEvento, semanaPlano):
  conflitos = []
  for bloco in semanaPlano.blocos:
    if overlaps(novoEvento, bloco):
      conflitos.append({ bloco, sobreposicaoMinutos: ... })

  sugestoes = []
  if conflitos:
    sugestoes = encontrarSlotsLivres(semanaPlano, duracao: bloco.duracao, frenteId: bloco.frenteId)[:3]

  return { conflitos, sugestoes }
```

---

## 10. UX E FLUXOS

### Para o agente UX

### Referências visuais (já existem)
- **Mockups completos:** `12-mockups-app.html` — 8 telas com toggle claro/escuro, cores das frentes, ícones da Bússola.
- **Planilha funcional como demo:** `13-planilha-piloto.html` — mostra interação real com dados.
- **Versão tabular:** `13-planilha-piloto.xlsx`.

### Fluxos críticos (mapas)

**Fluxo F1 — Primeira vez (onboarding):**
```
Signup → email confirmação → tela de boas-vindas →
adicionar frentes (mínimo 1) → adicionar compromissos fixos (opcional) →
revisar agenda padrão sugerida → confirmar → painel da manhã (dia atual)
```

**Fluxo F2 — Uso diário (segunda 6h):**
```
Push notification "Bom dia" → abre app → painel da manhã →
clica em bloco (opcional, pra detalhar) → fecha → trabalha →
bloco terminou (push V2) → swipe rápido → continua dia →
22h ritual da noite (notificação) → fechamento 2 min → dormir
```

**Fluxo F3 — Domingo 18h (revisão):**
```
Push "Hora da revisão" → abre app → tela Espelho →
ver matriz → ver desvios → ver insights →
roteiro guiado (4 perguntas) → encadeia → planejamento próxima semana →
gera/edita blocos → classifica I/U/D → define 3 prioridades → confirma
```

### Princípios de UX
1. **Decisões em ≤2 toques.** Cada ação principal: 1 ou 2 cliques.
2. **Default inteligente.** Bloco já vem pré-classificado; ajuste é exceção.
3. **Linguagem humana.** "Bora começar" > "Iniciar". "Foi como planejado?" > "Confirmar status".
4. **Sem culpa.** Sistema adapta, não pune. Imprevisto é parte da vida.
5. **Calmaria visual.** Cores suaves, espaço generoso, sem pop-ups invasivos.
6. **Acessibilidade:** WCAG AA, contraste mínimo 4.5:1, navegação por teclado.

---

## 11. ROADMAP POR FASES

### Para o agente PM

### FASE 0 — Validação (jun-ago 2026)
**Não desenvolve nada.** Roda piloto com planilha (`13-planilha-piloto.xlsx`) + 5-7 mentorados Gestão Operacional. Critério de avanço: 5/7 sustentam o sistema 4 semanas + 3/7 dizem "pagaria todo mês".

### FASE 1 — MVP (set-nov 2026 · 10-12 semanas)
**Escopo:** Épicos 1, 2, 3, 4 (sem integração com Calendar).

**Entregas:**
- ✅ Auth (signup, login)
- ✅ CRUD frentes
- ✅ CRUD compromissos fixos
- ✅ Algoritmo de agenda padrão
- ✅ CRUD blocos da semana
- ✅ Classificação planejado/realizado (swipe rápido manual no app)
- ✅ Painel da manhã / fechamento da noite
- ✅ Matriz do Espelho calculada
- ✅ Insights do Coach Gentil (15 regras V1)
- ✅ Revisão semanal completa
- ✅ PWA (instalável no celular)

**Métricas de saída da Fase 1:**
- 50 usuários cadastrados
- 30 ativos semanalmente (60% retenção 4 sem)
- ≥1 incident em produção, resolvido em <24h

### FASE 2 — Integração e automação (dez 2026 - fev 2027)
**Escopo:** Épico 5 + parte do 6.

**Entregas:**
- ✅ Integração Google Calendar (OAuth + sync bidirecional)
- ✅ Detecção automática de conflito
- ✅ Sugestão de realocação ativa
- ✅ Notificações push (manhã, noite, fim de bloco)
- ✅ Histórico de semanas + tendência (gráficos)
- ✅ Exportação de dados

### FASE 3 — Coach panel (mar-mai 2027)
**Escopo:** dashboard pra Lucas e outros mentores acompanharem N usuários.

**Entregas:**
- ✅ Multi-workspace (1 user = vários workspaces)
- ✅ Convite de "coach" pra ver outro workspace (somente leitura)
- ✅ Dashboard agregado de mentorados
- ✅ Comparativos entre semanas
- ✅ Stripe integration (assinatura mensal)

### FASE 4 — Mobile nativo + IA (jun+ 2027)
- React Native (iOS + Android)
- IA pra geração de insights mais sofisticados
- Outlook integration
- Sub-frentes (hierarquia opcional)

---

## 12. REQUISITOS NÃO-FUNCIONAIS

### Performance
- Painel da manhã: First Contentful Paint < 1.5s no 4G.
- Recálculo da matriz: < 100ms (servidor).
- Swipe rápido: feedback visual imediato (otimistic update).

### Segurança
- HTTPS obrigatório (HSTS).
- Senhas hasheadas com bcrypt (cost 10+).
- JWT com expiração 7 dias + refresh token.
- Rate limiting: 100 req/min por usuário.
- Validação de input com Zod (no front e no back).
- SQL injection coberto pelo Prisma.
- XSS coberto pelo React (sanitização automática).
- CSRF: SameSite cookies + tokens em mutations.

### Privacidade (LGPD)
- Política de privacidade clara e versionada.
- Consent explícito no signup.
- Endpoint de exportação dos próprios dados.
- Endpoint de deleção da conta (cascade nos dados associados).
- Logs sem PII.

### Acessibilidade
- WCAG 2.1 AA.
- Navegação por teclado.
- Suporte a screen readers.
- Contraste mínimo 4.5:1.
- Toggle claro/escuro respeitando preferência do SO.

### Internacionalização
- V1: pt-BR apenas.
- V2: en-US (preparar i18n com next-intl desde o início).

### Observabilidade
- Sentry pra erros.
- PostHog pra eventos produto (signup, conclusão de revisão, swipe).
- Logs estruturados (JSON) com correlation IDs.

---

## 13. ESTRATÉGIA DE TESTES (QA)

### Para o agente QA

### Tipos de teste por camada

| Camada | Ferramenta | Cobertura alvo |
|---|---|---|
| **Unit** | Vitest | 80% nas funções de domínio (AgendaSuggester, EspelhoCalculator, InsightEngine) |
| **Integration** | Vitest + supertest | 100% dos endpoints públicos |
| **E2E** | Playwright | Top 10 fluxos críticos |
| **Visual regression** | Chromatic ou Percy | Telas principais |
| **Manual exploratório** | — | A cada release |

### Cenários críticos de E2E (Playwright)
1. **Signup completo:** cadastro → confirmação → setup → primeiro bloco visto.
2. **Editar bloco e ver Espelho recalcular:** muda categoria → matriz atualiza.
3. **Revisão semanal completa:** revisão → planejamento da próxima → primeiro bloco da nova semana visível.
4. **Trocar tema claro/escuro:** verifica persistência.
5. **Adicionar frente nova no meio da semana:** verifica que blocos antigos não quebram.
6. **Deletar frente com blocos associados:** verifica que sistema avisa e oferece reatribuição.

### Casos de borda (regression suite)
- Frente com 0h de orçamento.
- Bloco com hora fim < hora início (deve rejeitar).
- Semana sem nenhum bloco (Espelho zero).
- Usuário em fuso horário não-padrão.
- Dia/horário de virada de horário de verão (cuidado em datas).
- Migração de schema sem perda de dados.

---

## 14. RISCOS TÉCNICOS

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| 1 | Algoritmo de sugestão de agenda gera resultados ruins → frustra usuário | Alto | Permitir override manual fácil. Iterar regras com base em feedback do piloto. |
| 2 | Cálculo da matriz lento com semanas longas (>100 blocos) | Médio | Cache no servidor; pre-computar ao salvar bloco. |
| 3 | Sync com Google Calendar pode duplicar eventos | Alto (V2) | Usar `externalEventId` com unique constraint. Testar bidirecionalidade. |
| 4 | Usuário com fuso horário diferente do servidor | Médio | Armazenar tudo em TZ do workspace; converter no cliente. |
| 5 | Push notifications dependem de browser/OS | Médio | Fallback em email. Usar Web Push Standard. |
| 6 | LGPD — exportação e deleção de dados | Alto | Endpoint endpoint testado no E2E. Documentação clara pro usuário. |
| 7 | Adoção lenta — usuários abandonam após 2 semanas | Alto | Onboarding guiado. Email reengajamento. Dashboard mostrando ganho real. |
| 8 | Marca "Tríade do Tempo" — confusão com Christian Barbosa | Médio | **Resolvido:** renomeado pra Bússola do Tempo. Disposto a parceria se ele se interessar. |

---

## 15. ANEXOS E REFERÊNCIAS

### Documentos do projeto (mesma pasta)
- `01-diagnostico.md` — diagnóstico inicial do Lucas, contexto de origem
- `02-principios.md` — princípios do sistema
- `03-rotina-semanal.md` — agenda padrão do Lucas (caso real)
- `04-rituais.md` — rituais manhã/noite/semanal
- `10-app-gestao-tempo.md` — tese V2 completa do produto
- `11-mockups-app.md` — mockups em ASCII (referência rápida)
- `12-mockups-app.html` — mockups visuais navegáveis (referência principal de UX)
- `13-planilha-piloto.html` — planilha funcional em HTML/JS
- `13-planilha-piloto.xlsx` — planilha em Excel com fórmulas vivas
- `gerar-planilha.py` — script Python pra regenerar a planilha

### Convenções de código
- Linguagem: TypeScript (frontend e backend, mesmo monorepo).
- Style: Prettier + ESLint com configuração `next/core-web-vitals`.
- Branch: `main` protegida; `develop` pra integração; features em `feature/<ticket>`.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- PR template com checklist (testes, doc, screenshot).

### Estrutura de monorepo sugerida
```
bussola-do-tempo/
├── apps/
│   ├── web/                # Next.js (frontend + API routes V1)
│   └── (futuro) mobile/    # React Native V4
├── packages/
│   ├── domain/             # AgendaSuggester, EspelhoCalculator, InsightEngine (testável standalone)
│   ├── db/                 # Prisma schema + migrations + seed
│   ├── ui/                 # componentes compartilhados
│   └── types/              # tipos TypeScript compartilhados
├── docs/                   # esse arquivo + futuras specs
├── .github/                # CI/CD workflows
└── README.md
```

### Definição de "Pronto" (DoD geral)
Uma história só é considerada pronta quando:
- [ ] Código revisado (PR aprovado por 1 dev sênior).
- [ ] Testes unitários da lógica de domínio passando.
- [ ] Teste E2E do fluxo principal passando (se aplicável).
- [ ] Documentação atualizada (README do pacote ou comentário no código).
- [ ] Acessibilidade verificada (Lighthouse > 90).
- [ ] Visual regression sem mudanças não-aprovadas.
- [ ] Deploy em ambiente de staging.
- [ ] Validação manual por PO (Lucas).

### Time mínimo recomendado (Fase 1)
- 1 PM/PO (Lucas como product owner, dedicação ~6h/sem)
- 1 Designer (freelance, ~30h pra finalizar mockups em Figma)
- 1-2 Fullstack Dev (Next.js + Prisma)
- 1 QA part-time

**Custo estimado Fase 1 (MVP):** R$ 80-150k em squad terceirizada, ou 3-4 meses de dev solo de alguém com stack consolidado.

---

## 📌 Próximas decisões do PO (Lucas)

Antes de iniciar Fase 1, decidir:
1. **Hospedagem:** Vercel + Supabase (recomendado) ou outra?
2. **Domínio:** comprar `bussoladotempo.com` ou similar?
3. **Stripe ou Hotmart** pra cobrança recorrente (Hotmart conecta com base BR; Stripe global)?
4. **Equipe:** contratar dev ou usar AIOX?
5. **Visual identity:** contratar designer pra logo, paleta refinada, identidade?
6. **Investimento inicial:** auto-fundado, fundo Gestão Operacional, captação externa?
7. **Carlos Barbosa:** abordar pra parceria/licença/co-marketing ou seguir 100% independente?

---

**FIM DO DOCUMENTO. Versão 1.0 · 25-05-2026.**
*Pronto pra consumo pela squad AIOX (agentes pm, architect, dev, qa, ux-design-expert) ou time humano.*
