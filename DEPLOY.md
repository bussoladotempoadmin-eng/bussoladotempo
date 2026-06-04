# 🚀 Guia de Deploy — Bússola do Tempo

Deploy na **Vercel** (app) + **Supabase** (banco). Push na `main` = deploy automático.

---

## 1. Variáveis de ambiente (na Vercel)

Em **Vercel → Project → Settings → Environment Variables**, adicione (todas em
*Production*, e de preferência também em *Preview*):

| Variável | Pra que serve | Onde pegar |
|---|---|---|
| `DATABASE_URL` | Conexão pooled do app (porta 6543) | Supabase → Settings → Database → Connection string → **Transaction** (pgbouncer) |
| `DIRECT_URL` | Conexão direta p/ migrations (porta 5432) | Supabase → mesma tela → **Session/Direct** |
| `NEXTAUTH_SECRET` | Assina os cookies de sessão | Gerar (ver abaixo) |
| `NEXTAUTH_URL` | URL pública do app | Ex: `https://bussoladotempo.com.br` (ou a `*.vercel.app`) |
| `RESEND_API_KEY` | Envio do magic link | Resend → API Keys |
| `EMAIL_FROM` | Remetente do email | Ex: `Bússola do Tempo <login@bussoladotempo.com.br>` (precisa de domínio verificado no Resend; senão use `onboarding@resend.dev`) |

Gerar o `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
# ou no PowerShell:
# [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

> ⚠️ `NEXTAUTH_URL` precisa bater exatamente com a URL onde o app roda, senão o
> magic link redireciona errado.

---

## 2. Configuração do projeto na Vercel

É um **monorepo pnpm**. Em **Settings → General**:

- **Root Directory:** `.` (raiz do repo — NÃO `apps/web`)
- **Framework Preset:** Next.js
- **Install Command:** `pnpm install`
- **Build Command:** `pnpm --filter @bussola/db generate && pnpm --filter web build`
  - (o `generate` cria o Prisma Client antes do build do app)
- **Output:** deixe o padrão do Next.

> Se a Vercel não detectar o pnpm, garanta `"packageManager": "pnpm@..."` no
> `package.json` (já está) — ela usa o Corepack.

---

## 3. Banco de produção

**Opção A — usar o Supabase dev por enquanto (rápido):** basta apontar as
`DATABASE_URL`/`DIRECT_URL` pro projeto dev. Bom pra estrear; só lembre que dados
de teste e reais ficam no mesmo lugar.

**Opção B — Supabase de produção (recomendado pro definitivo):**
1. Criar projeto `bussola-do-tempo-prod` no Supabase (região São Paulo).
2. Pegar as duas connection strings.
3. Aplicar as migrations no banco novo:
   ```bash
   # com as env de produção carregadas:
   pnpm --filter @bussola/db exec prisma migrate deploy
   ```
4. (Opcional) rodar o seed do caso Lucas: `pnpm --filter db seed`.

---

## 4. Resend (email)

- Pra mandar do seu domínio (`@bussoladotempo.com.br`), verifique o domínio no
  Resend (adiciona uns registros DNS).
- Enquanto não verificar, use `EMAIL_FROM="Bússola do Tempo <onboarding@resend.dev>"`
  (funciona, mas só envia pro seu próprio email no plano free).

---

## 5. Domínio

1. Comprar `bussoladotempo.com.br` (registro.br).
2. Vercel → Project → Settings → Domains → adicionar o domínio.
3. Apontar o DNS conforme a Vercel instruir (registro A/CNAME).
4. Atualizar `NEXTAUTH_URL` pro domínio final.

---

## 6. Checklist pós-deploy

- [ ] Resolver o "Action required" pendente na conta Vercel
- [ ] Abrir a URL → landing aparece
- [ ] Login com magic link funciona (chega o email, clica, entra)
- [ ] Criar uma frente / bloco e ver o espelho
- [ ] Instalar como PWA no celular (Adicionar à tela inicial) e abrir offline
- [ ] (Opcional) Lighthouse > 90 nas páginas principais

---

## 7. Fluxo dia a dia (depois de configurado)

```
git push origin main   →   Vercel builda e publica automaticamente
```

Migrations novas: rode `prisma migrate deploy` contra o banco de produção
(ou configure no build command se preferir automático).
