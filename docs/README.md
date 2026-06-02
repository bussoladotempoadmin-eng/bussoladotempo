# 📚 Documentação — Bússola do Tempo

> Tudo o que um dev ou agente AIOX precisa pra entender o produto e seguir construindo.

## Estrutura

```
docs/
├── 01-produto/        O que estamos construindo, pra quem e por quê
├── 02-spec-tecnica/   Como vamos construir (arquitetura, roadmap)
├── 03-operacao/       Contas, plataformas, scripts utilitários
└── 04-historia/       Origem do produto (contexto do fundador)
```

---

## 01 — Produto

| Arquivo | O que é |
|---|---|
| [tese.md](01-produto/tese.md) | Tese V2 do produto: dor central, proposta de valor, decisões de design, framework Bússola do Tempo (Importante / Urgente / Disperso) |
| [mockups-visuais.html](01-produto/mockups-visuais.html) | **Abrir no navegador.** 8 telas-chave em frames de celular, com toggle claro/escuro |
| [mockups-ascii.md](01-produto/mockups-ascii.md) | Mesmas 8 telas em ASCII (referência rápida no editor) |
| [planilha-piloto.html](01-produto/planilha-piloto.html) | **Abrir no navegador.** Versão funcional da planilha do piloto (cálculos via JS, localStorage) |
| [planilha-piloto.xlsx](01-produto/planilha-piloto.xlsx) | Mesma planilha em Excel com fórmulas vivas (SUMIFS + IF) |

---

## 02 — Spec Técnica

| Arquivo | O que é |
|---|---|
| [arquitetura.md](02-spec-tecnica/arquitetura.md) | Spec técnica completa (50+ pgs): personas, glossário, arquitetura, modelo de dados, contratos de API, épicos, histórias, lógica de negócio, requisitos não-funcionais, riscos |
| [roadmap.md](02-spec-tecnica/roadmap.md) | Roadmap operacional em 15 etapas. Onde estamos, próxima etapa, marco de lançamento |

---

## 03 — Operação

| Arquivo | O que é |
|---|---|
| [contas-plataformas.md](03-operacao/contas-plataformas.md) | Checklist de contas necessárias (GitHub, Vercel, Supabase, Resend, etc.) com custos e fases |
| [gerar-planilha-piloto.py](03-operacao/gerar-planilha-piloto.py) | Script Python que gera `01-produto/planilha-piloto.xlsx` a partir de dados (caso queira regerar) |

---

## 04 — História

| Arquivo | O que é |
|---|---|
| [diagnostico-inicial.md](04-historia/diagnostico-inicial.md) | Diagnóstico do Lucas (fundador) que originou o produto. Por que ele construiu isso — múltiplas frentes, urgência alheia vencendo prioridade própria |

---

## Sequência recomendada de leitura (dev novo)

1. `01-produto/tese.md` — entende o produto em 10 min
2. `01-produto/mockups-visuais.html` — vê o produto em 5 min
3. `02-spec-tecnica/arquitetura.md` (seções 1-6) — entende o domínio e dados em 20 min
4. `02-spec-tecnica/roadmap.md` — vê onde está e o que falta
5. `apps/web/PROGRESSO.md` — checkpoint atual do dev
6. Começa a codar
