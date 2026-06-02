# 🧭 Bússola do Tempo

> Sistema de gestão de tempo que cruza **Frentes de trabalho** com **Categorias da Bússola** (Importante / Urgente / Disperso), entregando o Espelho semanal — onde seu tempo realmente foi.

**Status:** em desenvolvimento (Fase 1 / MVP) · Lançamento beta alvo: **10/08/2026**

---

## 🛠️ Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Banco de dados:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** NextAuth.js (magic link + Google)
- **Hospedagem:** Vercel
- **Email transacional:** Resend

## 📁 Estrutura (monorepo pnpm)

```
bussola-do-tempo/
├── apps/
│   └── web/              # Next.js — frontend + API routes
├── packages/
│   ├── db/               # Prisma schema + migrations + seed
│   ├── domain/           # AgendaSuggester, EspelhoCalculator, InsightEngine
│   └── ui/               # Componentes compartilhados (futuro)
├── package.json          # Workspace raiz
└── pnpm-workspace.yaml
```

## 🚀 Começar

Pré-requisitos: Node 20+, pnpm 9+, Git.

```powershell
# Instalar dependências
pnpm install

# Rodar dev
pnpm dev
# → abre http://localhost:3000
```

## 📚 Documentação

A documentação de produto, especificação técnica, mockups e roadmap ficam em pasta separada:
`C:\Users\Doctum\projetos\Agenda Lucas Silveira\` (no PC do Lucas).

Principais artefatos:
- `10-app-gestao-tempo.md` — Tese do produto
- `12-mockups-app.html` — Mockups visuais
- `14-spec-tecnica-app.md` — Spec técnica completa
- `16-roadmap-construcao.md` — Roadmap em 15 etapas

## 📜 Licença

Privado. Propriedade do Lucas Silveira (Bússola do Tempo).
