# 📊 Progresso do desenvolvimento

| Etapa | Descrição | Status | Commit |
|---|---|---|---|
| 0 | Contas criadas (GitHub, Vercel, Supabase, Resend) | ✅ | — |
| 1 | Setup monorepo + Next.js + Tailwind + tema | ✅ | `6ef7775` |
| 2 | Prisma + Supabase + schema + migration + seed | ✅ | — |
| 3 | Autenticação (NextAuth + magic link) | ✅ | `b53dd10` |
| 4 | CRUD Frentes | ✅ | `cc652fc` |
| 5 | CRUD Compromissos Fixos | ✅ | `69334da` |
| 6 | AgendaSuggester (algoritmo) | ✅ | `80fec7a` |
| 7 | CRUD Blocos da Semana | ✅ | `cf1ab37` |
| 8 | EspelhoCalculator (matriz) | ✅ | `0dde681` |
| 9 | InsightEngine (Coach Gentil) | ✅ | `ad7c412` |
| 10 | Revisão Semanal | ✅ | `e5baa7f` |
| 11 | Painel do Dia | ✅ | `6022747` |
| 12 | Swipe rápido entre blocos | ✅ | `c11746a` |
| 13 | Fechamento da noite | ✅ | `4daff37` |
| 14 | PWA + polimento | ✅ | `a66b47b` |
| 15 | Deploy na Vercel (app NO AR) | ✅ | — |

## Rodada de feedback do Lucas (06/06/2026)

Após testar, Lucas pediu 3 melhorias. Decidido construir nesta ordem:

- **Etapa 21 — Tarefas (checklist) dentro do bloco** ✅: novo modelo `SubTarefa`
  (migration `add_subtarefa_bloco`), `GET/POST /api/blocos/[id]/tarefas` e
  `PATCH/DELETE /api/tarefas/[id]`. Na tela Semana, cada bloco expande num
  checklist (marcar feito, adicionar, remover) com contador "feitas/total". O
  Painel do Dia mostra o contador (ex: 2/5) em cada bloco de hoje.
- **Etapa 22 — Aviso de conflito de horário** ✅: detecção client-side de blocos
  sobrepostos no mesmo dia. Banner âmbar no topo + badge "⚠️ conflito" em cada bloco
  envolvido. Não trava (decisão: avisar, não bloquear).
- **Etapa 23 — Visão de calendário** (pendente): adotar biblioteca pronta
  (react-big-calendar) com visão semana primeiro; mês/dia + Google Calendar depois.

---

## MVP+1 — fechando a "cola" (pós-auditoria, 04/06/2026)

Auditoria (planejado × construído) apontou que o core está pronto, mas falta a cola
que torna o app usável por qualquer pessoa (não só o caso Lucas). Frentes do MVP+1:

- **Etapa 16 — Configurações do workspace** ✅: tela `/configuracoes` + `PATCH /api/workspace`
  pra editar acordar/dormir/almoço/timezone/semana-início (alimentam o AgendaSuggester).
- **Etapa 17 — "Usar agenda padrão como semana"** ✅: `POST /api/agenda-padrao/aplicar`
  cria os blocos sugeridos numa semana real (com confirmação se já houver blocos).
  Fecha o ciclo gerar → aplicar, antes o sugestor era só preview.
- **Etapa 18 — Onboarding guiado** ✅: `/onboarding` (wizard 4 passos: ritmo →
  frentes → compromissos → gerar a semana). Usuário novo (0 frentes) é redirecionado
  pra cá ao logar. Orquestra as APIs existentes (workspace, frentes, compromissos,
  aplicar agenda).
- **Etapa 19 — Prioridades vinculadas a blocos** ✅: ⭐ em cada bloco na tela Semana
  (`PATCH /api/blocos/[id]/prioridade`, máx. 3, slot 1/2/3 automático). O Painel do Dia
  passa a mostrar os blocos prioritários (com fallback pro texto livre da Revisão).
- **Etapa 20 — LGPD mínima** ✅: `GET /api/exportar` (baixa todos os dados em JSON) e
  `DELETE /api/conta` (apaga conta + tudo, em ordem segura). UI na tela `/perfil`.

---

## Etapa 15 — APP NO AR em 04/06/2026 🚀

**URL de produção:** https://bussoladotempo-web.vercel.app (Vercel + Supabase dev)

### O que ficou pronto
- Deploy automático Vercel (push na `main` = deploy). Root Directory `apps/web`.
- Página pública `/sobre` + `DEPLOY.md`.
- Login com magic link funcionando em produção.

### A batalha do Prisma na Vercel (pra não esquecer)
O engine nativo do Prisma (`.so.node`) **não** era empacotado/encontrado no
runtime serverless da Vercel em monorepo pnpm. Solução definitiva: **Prisma
sem engine nativo** (`engineType = "client"` + driver `pg` via
`@prisma/adapter-pg`, com SSL). O query engine vira WASM (independente de
plataforma) e é incluído no bundle via `outputFileTracingIncludes`.

> Armadilha que custou horas: o engine nativo que sobrava no PC local mascarava
> o problema (testes locais "passavam"). A verificação real é apagar os engines
> nativos do disco antes de testar.

### Variáveis de ambiente na Vercel (todas obrigatórias)
`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`. (As do banco faltavam no início → 500 conectando
em 127.0.0.1.)

### Pendências conhecidas
- **Resend free:** `onboarding@resend.dev` só entrega pro email da conta Resend
  (`bussoladotempo.admin@gmail.com`). Pra enviar pra outros, verificar domínio.
- Conta logada (`admin`) está sem dados de seed (seed está sob outro email).
- Domínio próprio `bussoladotempo.com.br` ainda não comprado (usando URL Vercel).

---

## Etapa 14 — entregue em 02/06/2026

### O que ficou pronto

**PWA — instalável no celular.**

- **Ícones** (compasso em azul da marca) gerados em `public/`: 192, 512, maskable 512
  e apple-touch 180. Script reproduzível em `apps/web/scripts/gen-icons.mjs` (usa
  `sharp` instalado ad-hoc — não fica como dependência do app).
- **Manifesto** em `app/manifest.ts` (name, short_name, display standalone,
  theme/background color, ícones any + maskable).
- **Service worker** `public/sw.js`: shell offline + cache-first de estáticos +
  network-first nas navegações (com fallback offline). Não cacheia `/api`.
  Registrado via `components/pwa-register.tsx` (só em produção).
- **Metadata** no `layout.tsx`: manifest, apple-web-app, ícones e `themeColor`.
- Tema claro/escuro persistente (next-themes) já vinha da Etapa 1.

> Para instalar: abrir o site no celular → "Adicionar à tela inicial". O service
> worker só ativa em produção (após o deploy da Etapa 15).

---

## Etapa 13 — entregue em 02/06/2026

### O que ficou pronto

**Fechamento da noite** — ritual de 2 min antes de dormir.

- **Novo modelo `FechamentoDia`** (migration `add_fechamento_dia`): 1 anotação por
  dia por workspace (`@@unique([workspaceId, data])`) com destaque, aprendizado e nota.
- **`GET/PUT /api/noite`** (upsert por data) + Zod em `lib/schemas/noite.ts`.
- **Página `/noite`** + `noite-form.tsx` (client): resumo do dia (horas, quantos
  blocos foram como planejado vs desviaram — calculado no cliente pra respeitar o
  timezone), 2 campos livres (o que foi bom / o que melhorar) e nota 1-5. Carrega o
  fechamento existente do dia pra reeditar. Tela de sucesso ao fechar.

---

## Etapa 12 — entregue em 02/06/2026

### O que ficou pronto

**Swipe rápido** — registrar o que aconteceu num bloco com um toque (Tela 4).

- **`PATCH /api/blocos/[id]/realizado`** — body `{ resultado }`:
  - `SIM` → realizado = planejado
  - `URGENTE` → realizado = Urgente + marca `invadido`
  - `DISPERSO` → realizado = Disperso
- **Modal no Painel do Dia**: ao tocar num bloco, abre com 4 opções (Fiz / Virou
  urgente / Foi disperso / Depois). **Update otimista** (a categoria realizada muda
  na hora, reverte se a API falhar) e **auto-fecha em 60s = "Fiz"**.
- A linha do bloco passa a mostrar o badge de desvio quando o realizado difere do
  planejado.

---

## Etapa 11 — entregue em 02/06/2026

### O que ficou pronto

**Painel do Dia** — a home `/` agora é condicional: deslogado mostra a landing,
logado mostra o painel da manhã.

- **`apps/web/src/app/painel-dia.tsx`** (client): saudação por horário, as **3
  prioridades da semana**, a **lista de blocos de hoje** e **quick actions**
  (Semana / Espelho / Revisão / Frentes).
- **Indicador "agora"**: usa o relógio do dispositivo (atualiza a cada minuto),
  destaca o bloco em andamento com anel + badge "agora" e esmaece os já passados.
  Filtra o dia no cliente (evita problema de timezone do servidor).
- **`page.tsx`** virou server component async: checa sessão, carrega a SemanaPlano
  da semana atual + blocos + frentes + prioridades, e renderiza `PainelDia`.

---

## Etapa 10 — entregue em 02/06/2026

### O que ficou pronto

**Revisão Semanal** — o fluxo guiado de domingo, em 4 passos.

- **`PUT/GET /api/semanas/[iso]/revisao`** — salva a retro e já **prepara a próxima
  semana** (risco + 3 prioridades gravados na SemanaPlano seguinte). Ao concluir,
  marca a semana revisada como `FECHADA`.
- **Página `/revisao/[iso]`** (+ `/revisao` → semana atual) com stepper:
  1. **Espelho** da semana (total + % por categoria)
  2. **Maiores desvios + Coach Gentil** (reusa EspelhoCalculator e InsightEngine)
  3. **Retrospectiva** — 4 campos (funcionou / não funcionou / vou mudar) + sensação 1–5
  4. **Próxima semana** — maior risco + 3 prioridades
  - Botões "Salvar rascunho" e "Concluir revisão"; tela de sucesso encadeia pro
    planejamento da próxima (`/semana/[próxima]`).
- **Validação Zod** em `apps/web/src/lib/schemas/revisao.ts`.

> Nota: as 3 prioridades passam a ser **texto livre** (descrição da prioridade),
> gravadas em `prioridade1/2/3` da SemanaPlano. O Painel (Etapa 11) lê esses campos.

---

## Etapa 9 — entregue em 02/06/2026

### O que ficou pronto

**InsightEngine (Coach Gentil)** — lê o espelho e gera recados em linguagem humana.

- **`packages/domain/src/insight-engine.ts`** — 15 regras V1 (11 globais + 4 por
  frente), cada uma com 3 variações de template escolhidas de forma determinística
  (sem `Math.random`, pra ser testável). Tom: nunca culpa, sempre dá próximo passo.
  - Globais: importante alto/baixo, bombeiro, urgência subindo, disperso alto/baixo,
    semana equilibrada, planejado×realizado (caiu/bateu/urgência invadiu), concentração.
  - Por frente: virou bombeiro, bem protegida, dispersando, tempo migalha.
- **`insight-engine.test.ts`** — 7 testes (vazia, imp alto, bombeiro, disperso,
  por frente, determinismo, título/texto não vazios). Domínio agora: **18 testes**.
- **`GET /api/semanas/[iso]/insights`**.
- **UI na página `/espelho/[iso]`** — seção "Coach Gentil" com cards coloridos por
  tipo (GOOD verde, WARN âmbar, TIP azul, NEUTRAL neutro).

---

## Etapa 8 — entregue em 02/06/2026

### O que ficou pronto

**EspelhoCalculator** (a killer feature: matriz Frente × Categoria) + testes + tela.

- **`packages/domain/src/espelho-calculator.ts`** — função pura da §9.2 da spec:
  matriz Frente × Categoria (horas realizadas), totais por frente/categoria/geral,
  percentuais, comparativo planejado vs realizado (com delta) e top 3 desvios.
- **`espelho-calculator.test.ts`** — 5 testes (semana vazia, soma na célula certa,
  percentuais somam 1, comparativo/delta, top 3 desvios por duração). Total no
  domínio agora: **11 testes**.
- **`GET /api/semanas/[iso]/espelho`** — retorna o espelho + frentes pra render.
- **Página `/espelho/[iso]`** (+ `/espelho` → semana atual): summary bar (total +
  % por categoria), matriz visual com totais, comparativo planejado vs realizado
  com barras, e cards dos 3 maiores desvios. Navegação entre semanas + atalho
  "Editar blocos".

---

## Etapa 7 — entregue em 02/06/2026

### O que ficou pronto

**CRUD completo de Blocos da Semana** — equivalente online da aba "Blocos" da planilha.

- **Validação Zod** em `apps/web/src/lib/schemas/bloco.ts` (dia, horários `HH:mm`,
  tarefa, frente obrigatória, categorias planejada/realizada, hora-fim > início).
- **Helpers de semana ISO** em `apps/web/src/lib/semana.ts`: cálculo da semana ISO,
  navegação (semana anterior/próxima), rótulo de intervalo, e `getOrCreateSemana`
  (cria a SemanaPlano no primeiro acesso).
- **Rotas de API:**
  - `GET /api/blocos?semana=2026-W24` — lista os blocos da semana
  - `POST /api/blocos` — cria (resolve/cria a SemanaPlano; valida frente do workspace)
  - `PATCH/DELETE /api/blocos/[id]` — edita e remove (posse via SemanaPlano → workspace)
- **Página `/semana/[iso]`** (e `/semana` → redireciona pra semana atual):
  blocos agrupados por dia, **cor por frente** (borda) + **cor por categoria** (chips
  da tríade), badge de desvio planejado→realizado, navegação entre semanas, total de
  horas por dia e da semana. Formulário inline pra criar/editar.

---

## Etapa 6 — entregue em 02/06/2026

### O que ficou pronto

**Algoritmo `AgendaSuggester`** (o coração do produto) + **testes Vitest** + tela.

- **`packages/domain/src/agenda-suggester.ts`** — heurística V1 da §9.1 da spec,
  função pura e determinística:
  - Janelas por dia (manhã pós-acordar+1h, tarde até dormir-30min)
  - Subtrai compromissos fixos, distribui cada frente por prioridade (campo `ordem`),
    preferindo manhãs e espalhando entre os dias úteis (SEG–SEX)
  - Junta blocos contíguos e retorna aviso de capacidade quando o orçamento não cabe
- **`agenda-suggester.test.ts`** — 6 testes (os 4 obrigatórios da spec + manhãs +
  frente 0h). Rodar com `pnpm test`.
- **Infra de testes:** Vitest adicionado ao `@bussola/domain`; script `test` na raiz.
- **`POST /api/agenda-padrao`** — gera o preview (sem persistir; persistência fica
  na Etapa 7).
- **Página `/agenda-padrao`** — botão "Gerar agenda padrão", grid semanal SEG–SEX
  com blocos coloridos por frente, compromissos fixos como blocos travados,
  legenda com horas por frente e aviso de capacidade.

### Achado importante (validado pelos testes)
A capacidade de SEG–SEX do Lucas é ~56,5h, mas o orçamento é 59h. O algoritmo
**avisa que excede** e sugere usar o sábado ou reduzir uma frente — comportamento
correto, bate com a realidade (a agenda real do Lucas usa o sábado).

---

## Etapa 5 — entregue em 02/06/2026

### O que ficou pronto

**CRUD completo de Compromissos Fixos** (o que se repete toda semana em horário fixo):

- **Validação Zod** em `apps/web/src/lib/schemas/compromisso.ts` — dia da semana,
  horários `HH:mm`, descrição, frente (opcional) e categoria, com regra
  **hora-fim > hora-início**. Inclui labels de dia/categoria reutilizáveis.
- **Rotas de API:**
  - `GET/POST /api/compromissos` — lista (ordenada por dia e hora) e cria
  - `PATCH/DELETE /api/compromissos/[id]` — edita e remove
  - Toda escrita valida posse por workspace + que a frente escolhida é do usuário
- **Página `/compromissos`**: lista agrupada por dia da semana, formulário inline
  (dia, início, fim, descrição, frente, categoria), editar/excluir. Acessível pelo
  menu do usuário.

---

## Etapa 4 — entregue em 02/06/2026

### O que ficou pronto

**CRUD completo de Frentes**, ligado ao workspace do usuário logado:

- **Validação Zod compartilhada** front/back em `apps/web/src/lib/schemas/frente.ts`
  (nome, ícone, cor `#RRGGBB`, orçamento de horas 0–168).
- **Helper de workspace** em `apps/web/src/lib/workspace.ts` — todo usuário logado
  tem (ou ganha no 1º acesso) um workspace.
- **Rotas de API:**
  - `GET/POST /api/frentes` — lista e cria (nova frente vai pro fim da ordem)
  - `PATCH/DELETE /api/frentes/[id]` — edita e remove (com proteção de posse +
    erro amigável 409 se a frente tiver blocos vinculados)
  - `PATCH /api/frentes/reorder` — persiste a nova ordem (transação)
- **Página `/frentes`** (`apps/web/src/app/frentes/`): lista com drag-and-drop
  (@dnd-kit), formulário inline pra criar/editar, ativar/desativar (soft delete),
  excluir, e total de horas/semana orçadas. Acessível pelo menu do usuário.

### Dependências adicionadas
- `zod` 4 (validação)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (reordenação)

### ⚠️ Ponto de atenção (descoberto nesta etapa)
O seed usa o email `lucasctgasilveira@gmail.com`, mas o login real do Lucas é
`lucas.ctga.silveira@gmail.com` (com pontos). São usuários diferentes pro NextAuth —
ao logar de verdade, cai num workspace vazio. Resolver: ou ajustar o email do seed,
ou criar as frentes pela própria UI (que é justamente o que a Etapa 4 entrega).

---

## Etapa 2 — entregue em 02/06/2026

### O que ficou pronto

**Schema completo** em `packages/db/prisma/schema.prisma` — 12 tabelas:
- **Auth (NextAuth):** User, Account, Session, VerificationToken
- **Domínio:** Workspace, Frente, CompromissoFixo, SemanaPlano, Bloco, Revisao, Insight
- **Enums:** SemanaInicio, DiaSemana, Categoria, StatusSemana, FonteOrigem, TipoInsight

**Migration aplicada:** `20260602180937_init` — todas as tabelas criadas no Supabase.

**Seed populado** com o caso Lucas (validado na Fase 0):
- 1 User (Lucas)
- 1 Workspace (configs: sono 22h30→6h, almoço 12h-13h30)
- 4 Frentes: Doctum (36h), Tribo (18h), Dra. Bruna (2,5h), CuidaJA (2,5h) = **59h/sem**
- 7 Compromissos fixos: treino seg-sex 7h-8h, mentoria seg 18h30, live qui 18h
- 1 SemanaPlano (2026-W24 = 08-14/06/2026) com **24 blocos** classificados (planejados + realizados)
- 3 prioridades da semana cravadas

### Stack confirmado
- Prisma 6.19.3 (downgrade do 7 que tem breaking changes)
- @prisma/client 6.19.3
- tsx 4.22.4 (rodar TypeScript direto)
- PostgreSQL 17 (Supabase, São Paulo)

### Como inspecionar o banco
```powershell
cd C:\Users\Doctum\projetos\bussola-do-tempo\packages\db
pnpm studio
# abre http://localhost:5555 com visualização das tabelas
```

### Como resetar
```powershell
pnpm --filter db reset    # apaga tudo e recria + roda seed
pnpm --filter db seed     # só roda seed novamente
```

### Pré-requisitos pra Etapa 3 (Auth)
- Conta Resend (já feita)
- Quando rodar Etapa 3, vou pedir API key da Resend (ele vai te ensinar como gerar)
