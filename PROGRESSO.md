# 📊 Progresso do desenvolvimento

| Etapa | Descrição | Status | Commit |
|---|---|---|---|
| 0 | Contas criadas (GitHub, Vercel, Supabase, Resend) | ✅ | — |
| 1 | Setup monorepo + Next.js + Tailwind + tema | ✅ | `6ef7775` |
| 2 | Prisma + Supabase + schema + migration + seed | ✅ | — |
| 3 | Autenticação (NextAuth + magic link) | ✅ | `b53dd10` |
| 4 | CRUD Frentes | ✅ | `cc652fc` |
| 5 | CRUD Compromissos Fixos | ✅ | — |
| 6 | AgendaSuggester (algoritmo) | ⏳ próxima | — |
| 7 | CRUD Blocos da Semana | ⏸ | — |
| 8 | EspelhoCalculator (matriz) | ⏸ | — |
| 9 | InsightEngine (Coach Gentil) | ⏸ | — |
| 10 | Revisão Semanal | ⏸ | — |
| 11 | Painel do Dia | ⏸ | — |
| 12 | Swipe rápido entre blocos | ⏸ | — |
| 13 | Fechamento da noite | ⏸ | — |
| 14 | PWA + polimento | ⏸ | — |
| 15 | Testes + Deploy + Domínio | ⏸ | — |

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
