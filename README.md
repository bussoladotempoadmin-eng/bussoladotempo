# 🧭 Bússola do Tempo

> Sistema de gestão de tempo que cruza **Frentes de trabalho** com **Categorias da Bússola** (Importante / Urgente / Disperso), entregando o Espelho semanal — onde seu tempo realmente foi.

**Status:** em desenvolvimento (Fase 1 / MVP)
**Lançamento beta alvo:** 10/08/2026
**Fundador:** Lucas Silveira

---

## 🗺️ Mapa do projeto

```
bussola-do-tempo/
├── apps/                 ← código do app (Next.js)
│   └── web/              Frontend + API routes
│
├── packages/             ← pacotes compartilhados
│   ├── db/               Prisma schema + migrations + seed
│   ├── domain/           Lógica de negócio (calculators, engines)
│   └── ui/               Componentes compartilhados
│
├── docs/                 ← documentação (vai pro GitHub)
│   ├── 01-produto/       Tese, mockups, planilha do piloto
│   ├── 02-spec-tecnica/  Arquitetura + roadmap
│   ├── 03-operacao/      Contas, plataformas, scripts utilitários
│   └── 04-historia/      Contexto de origem do produto
│
└── pessoal/              ← privado, NÃO vai pro GitHub (.gitignore)
    ├── senhas/
    └── agenda-pessoal/   Agenda original do fundador (pausada)
```

---

## 🚀 Começar a desenvolver

**Pré-requisitos:** Node 20+, pnpm 9+, Git.

```powershell
# Instalar dependências
pnpm install

# Subir o app local (http://localhost:3000)
pnpm dev

# Outras ações úteis
pnpm build                          # build de produção
pnpm --filter db studio             # abrir Prisma Studio
pnpm --filter db migrate:dev        # nova migration
pnpm --filter db seed               # popular dados de exemplo
```

**Para o setup completo de banco e autenticação:**
- Configure `apps/web/.env.local` com `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`.
- Configure `packages/db/.env` com `DATABASE_URL` e `DIRECT_URL`.
- Veja [docs/03-operacao/contas-plataformas.md](docs/03-operacao/contas-plataformas.md) pra detalhes de cada conta.

---

## 📚 Por onde começar a ler

**Se você é dev (ou agente AIOX) novo no projeto:**

1. **[docs/01-produto/tese.md](docs/01-produto/tese.md)** — o que é o produto, pra quem, qual o diferencial
2. **[docs/01-produto/mockups-visuais.html](docs/01-produto/mockups-visuais.html)** — abre no navegador, veja como o app deveria ser
3. **[docs/02-spec-tecnica/arquitetura.md](docs/02-spec-tecnica/arquitetura.md)** — modelo de dados, API, lógica
4. **[docs/02-spec-tecnica/roadmap.md](docs/02-spec-tecnica/roadmap.md)** — sequência de 15 etapas; qual estamos
5. **[apps/web/PROGRESSO.md](apps/web/PROGRESSO.md)** — onde estamos no desenvolvimento

**Se você quer entender a origem:**
- **[docs/04-historia/diagnostico-inicial.md](docs/04-historia/diagnostico-inicial.md)** — diagnóstico do Lucas que originou o produto

---

## 🛠️ Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind 3 + shadcn-style
- **Auth:** NextAuth 4 + Resend (magic link)
- **Database:** PostgreSQL (Supabase) + Prisma 6
- **Deploy:** Vercel (frontend + API routes)
- **Email:** Resend
- **Mobile:** PWA (V1) → React Native (V4)

---

## 📜 Licença

Privado. Propriedade do Lucas Silveira / Bússola do Tempo.
Não distribuir, copiar ou redistribuir sem autorização.
