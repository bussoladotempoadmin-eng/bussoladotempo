# 📊 Progresso do desenvolvimento

| Etapa | Descrição | Status | Commit |
|---|---|---|---|
| 0 | Contas criadas (GitHub, Vercel, Supabase, Resend) | ✅ | — |
| 1 | Setup monorepo + Next.js + Tailwind + tema | ✅ | `6ef7775` |
| 2 | Prisma + Supabase + schema + migration + seed | ✅ | — |
| 3 | Autenticação (NextAuth + magic link) | ⏳ próxima | — |
| 4 | CRUD Frentes | ⏸ | — |
| 5 | CRUD Compromissos Fixos | ⏸ | — |
| 6 | AgendaSuggester (algoritmo) | ⏸ | — |
| 7 | CRUD Blocos da Semana | ⏸ | — |
| 8 | EspelhoCalculator (matriz) | ⏸ | — |
| 9 | InsightEngine (Coach Gentil) | ⏸ | — |
| 10 | Revisão Semanal | ⏸ | — |
| 11 | Painel do Dia | ⏸ | — |
| 12 | Swipe rápido entre blocos | ⏸ | — |
| 13 | Fechamento da noite | ⏸ | — |
| 14 | PWA + polimento | ⏸ | — |
| 15 | Testes + Deploy + Domínio | ⏸ | — |

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
