# Mockups do App — V2 (sem código)

> Criado em 2026-05-25. Telas em ASCII pra visualização rápida no IDE/celular.
> **NÃO é design final.** É o suficiente pra discutir produto, validar com mentorados, e criar a planilha do piloto.

---

## Fluxo principal — 8 telas-chave

### 🖥️ Tela 1.1 — Setup: adicionar frente

```
╔══════════════════════════════════════════════════════════════╗
║  ⚙️  Setup · Passo 1 de 3 · Suas frentes                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Quais são suas áreas de trabalho?                          ║
║  Pra cada uma, quantas horas por semana?                    ║
║                                                              ║
║  ┌─ Frente 1 ─────────────────────────────────────┐         ║
║  │ Nome:  🏢 Trabalho Operacional                               │         ║
║  │ Horas/sem:  36 h                               │         ║
║  └────────────────────────────────────────────────┘         ║
║                                                              ║
║  ┌─ Frente 2 ─────────────────────────────────────┐         ║
║  │ Nome:  🛒 Gestão Operacional                                │         ║
║  │ Horas/sem:  18 h                               │         ║
║  └────────────────────────────────────────────────┘         ║
║                                                              ║
║  ┌─ Frente 3 ─────────────────────────────────────┐         ║
║  │ Nome:  🎓 Agenda externa                           │         ║
║  │ Horas/sem:  2,5 h                              │         ║
║  └────────────────────────────────────────────────┘         ║
║                                                              ║
║  ┌─ Frente 4 ─────────────────────────────────────┐         ║
║  │ Nome:  🤝 Reuniões                              │         ║
║  │ Horas/sem:  2,5 h                              │         ║
║  └────────────────────────────────────────────────┘         ║
║                                                              ║
║  [ + Adicionar frente ]                                     ║
║                                                              ║
║  Total: 59h/semana                                          ║
║                                                              ║
║                              [ Próximo: compromissos fixos →]║
╚══════════════════════════════════════════════════════════════╝
```

### 🖥️ Tela 1.2 — Setup: agenda padrão sugerida

```
╔══════════════════════════════════════════════════════════════╗
║  ⚙️  Setup · Passo 3 de 3 · Sua agenda padrão                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Geramos uma proposta. Ajuste arrastando se quiser.         ║
║                                                              ║
║         SEG       TER       QUA       QUI       SEX  SÁB    ║
║  06h    Ritual                                              ║
║  07h    Treino                                              ║
║  08h    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional      ║
║  09h    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional      ║
║  10h    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional      ║
║  11h    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional      ║
║  12h    Almoço                                       Gestão Operacional  ║
║  13h    Trabalho Operacional    Agenda externa30   Agenda externa30   Trabalho Operacional    Agenda externa1  ║
║  14h    Trabalho Operacional    CJ30      CJ30      Trabalho Operacional    CJ1     ║
║  15h    Trabalho Operacional    Gestão Operacional     Gestão Operacional     Trabalho Operacional    Trabalho Operacional  ║
║  16h    Trabalho Operacional    Gestão Operacional     Gestão Operacional     Trabalho Operacional    Trabalho Operacional      ║
║  17h    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional    Trabalho Operacional      ║
║  18h    Mentoria  Trabalho Operacional    Trabalho Operacional    Live      Trabalho Operacional      ║
║  19h    Mentoria                      Live                  ║
║  20h    Mentoria                      Live                  ║
║  21h    Mentoria                      Live                  ║
║                                                              ║
║  Resumo: 36h Trabalho Operacional + 18h Gestão Operacional + 2,5h Agenda externa + 2,5h CJ = 59h║
║                                                              ║
║  [ Refazer ]    [ Ajustar bloco ]    [ Confirmar e usar > ] ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 🖥️ Tela 2 — Painel da manhã (uso diário)

```
╔══════════════════════════════════════════════════════════════╗
║  ☀️ Segunda 01/06 · Bom dia, Lucas                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎯 PRIORIDADES DA SEMANA                                    ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │ 1️⃣  Revisar pipeline Trabalho Operacional            🏢 Trabalho Operacional    │    ║
║  │ 2️⃣  Gravar aula 04 mentoria            🛒 Gestão Operacional     │    ║
║  │ 3️⃣  Reunião alinhamento Reuniões        🤝 Reuniões   │    ║
║  └─────────────────────────────────────────────────────┘    ║
║                                                              ║
║  📅 SEUS BLOCOS DE HOJE          59h previstas na semana    ║
║                                                              ║
║  08h ────────── 12h    🎯 Trabalho Operacional                             ║
║       Revisar pipeline + alinhar marketing                  ║
║       ↑ Prioridade 1                                        ║
║                                                              ║
║  13h30 ──────── 18h    🎯 Trabalho Operacional                             ║
║       1:1 vendedor X + ajustes pipeline                     ║
║                                                              ║
║  18h30 ──────── 21h30  🎯 Gestão Operacional                              ║
║       🎤 Mentoria - aula ao vivo                            ║
║       ↑ Prioridade 2                                        ║
║                                                              ║
║         [ Bora começar  → ]                                  ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 🖥️ Tela 3 — Swipe rápido entre blocos

```
┌──────────────────────────────────────────────────────────┐
│ 🔔 Bloco terminou às 12h00                               │
│                                                          │
│ Trabalho Operacional · 08h-12h                                         │
│ Revisar pipeline + alinhar marketing                     │
│                                                          │
│ Foi como planejado? (🎯 Importante)                      │
│                                                          │
│  [ ✅ Sim, foi Importante ]                              │
│  [ 🔥 Não, virou Urgente ]                               │
│  [ 💨 Não, virou Disperso ]                        │
│  [ ⏰ Pergunta de novo às 14h ]                          │
│                                                          │
│ Default em 60s: Sim                                      │
└──────────────────────────────────────────────────────────┘
```

---

### 🖥️ Tela 4 — Planejamento semanal (domingo)

```
╔══════════════════════════════════════════════════════════════╗
║  🧭 Planejamento - Semana 01-07/06                            ║
║  Passo 3 de 4: Classificar os blocos                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Toque em cada bloco pra confirmar/mudar a classificação    ║
║  💡 Sugestões já preenchidas baseadas no padrão da frente   ║
║                                                              ║
║  ┌────────────────────────────────────────────────────┐    ║
║  │ SEG 08h-12h  Trabalho Operacional                                │    ║
║  │ Revisar pipeline + marketing            🎯 Imp.    │    ║
║  ├────────────────────────────────────────────────────┤    ║
║  │ SEG 13h30-18h  Trabalho Operacional                              │    ║
║  │ 1:1 vendedor X                          🔥 Urg.    │    ║
║  ├────────────────────────────────────────────────────┤    ║
║  │ SEG 18h30-21h30  🎤 Mentoria Gestão Operacional                 │    ║
║  │ Aula 04 ao vivo                         🎯 Imp.    │    ║
║  ├────────────────────────────────────────────────────┤    ║
║  │ TER 13h30-14h  Agenda externa                          │    ║
║  │ Status semanal + revisar material       💨 Disp.   │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                              ║
║  Resumo planejado da semana:                                ║
║  🎯 Importante: 28h (47%)  🔥 Urgente: 24h  💨 Disp: 7h     ║
║                                                              ║
║  [ Voltar ]                            [ Próximo: 3 prior > ]║
╚══════════════════════════════════════════════════════════════╝
```

---

### 🖥️ Tela 5 — O ESPELHO (revisão semanal · estrela do produto)

```
╔══════════════════════════════════════════════════════════════╗
║  📊 Sua semana 25-31/05 · O Espelho                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║              Trabalho Operacional   Gestão Operacional   Agenda externa   Reuniões   Total       ║
║  🎯 Imp.      8h      10h      1h     0h        19h (32%)   ║
║  🔥 Urg.     22h       5h      1h     2h        30h (51%) ⚠ ║
║  💨 Disp.     6h       3h    30m    30m         10h (17%)   ║
║  ─────────────────────────────────────────────────────────  ║
║  Total       36h      18h    2h30   2h30        59h         ║
║                                                              ║
║  Planejado vs Realizado:                                    ║
║  🎯 Importante:     47% → 32%   ⬇ -15pp                     ║
║  🔥 Urgente:        41% → 51%   ⬆ +10pp                     ║
║  💨 Disperso: 12% → 17%   ⬆ +5pp                      ║
║                                                              ║
║  🔴 Top 3 desvios da semana:                                ║
║  1. Qui 13h30-15h  Gestão Operacional Imp. → Trabalho Operacional Urg. (CEO)           ║
║  2. Ter 16h-19h    Reuniões Imp. → Disp. (msgs)              ║
║  3. Sex 13h30-19h  Trabalho Operacional Imp. → Urg. + Disp. (proposta)    ║
║                                                              ║
║                                  [ Ver insights do Coach → ]║
╚══════════════════════════════════════════════════════════════╝
```

---

### 🖥️ Tela 6 — Insights do Coach (linguagem humana)

```
╔══════════════════════════════════════════════════════════════╗
║  💬 Insights da semana                                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ✅ Gestão Operacional manteve foco em Importante (56%)                   ║
║     Você está protegendo sua frente própria. Bom sinal.     ║
║                                                              ║
║  ⚠️ Trabalho Operacional virou bombeiro: 61% Urgente                       ║
║     Pela 2ª semana seguida. Vale pensar em delegar ou       ║
║     redesenhar o pipeline de demanda.                       ║
║                                                              ║
║  ⚠️ Sexta 13h30-19h vira caos 3 semanas seguidas             ║
║     Esse bloco está estourando como Urgente.                ║
║     Considere mover Trabalho Operacional-pesado pra outra janela ou       ║
║     aceitar oficialmente que é seu bloco "bombeiro".        ║
║                                                              ║
║  🎯 Sua prioridade #1 (Revisar pipeline) recebeu 2h         ║
║     dos 4h planejados. Considere proteger esse bloco        ║
║     de reuniões na próxima semana.                          ║
║                                                              ║
║                                       [ Próximo: Roteiro → ]║
╚══════════════════════════════════════════════════════════════╝
```

---

### 🖥️ Tela 7 — Conflito detectado (adaptação)

```
╔══════════════════════════════════════════════════════════════╗
║  ⚠️ Conflito detectado                                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  "Reunião pipeline Trabalho Operacional" entrou em Quinta 14h-15h.        ║
║                                                              ║
║  Conflita com seu bloco:                                    ║
║  ┌────────────────────────────────────────────────────┐    ║
║  │ Quinta 13h30-17h30  🎯 Trabalho Operacional                      │    ║
║  │ Revisar pipeline trimestral · Prioridade 1         │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                              ║
║  💡 Sugestões pra remarcar o bloco original:                ║
║                                                              ║
║  • Sexta 15h-18h30 (espaço disponível, mesma frente)        ║
║  • Quarta 17h-19h (cabe nos 2h restantes do orçamento)      ║
║                                                              ║
║  [ Manter (sobrepor) ]                                      ║
║  [ Remarcar pra sex 15h ]    [ Remarcar pra qua 17h ]       ║
║  [ Cancelar bloco essa semana ]                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 🖥️ Tela 8 — Fechamento da noite

```
╔══════════════════════════════════════════════════════════════╗
║  🌙 Fechamento · Segunda 01/06                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📊 Hoje:                                                    ║
║     Planejado: 4h Imp. · 1h Urg. · 3h Disp.                  ║
║     Realizado: 2h Imp. · 4h Urg. · 2h Disp.                  ║
║                                                              ║
║  ⚠️ Diferença: 2h Importante viraram Urgente                 ║
║     (Bloco 13h30-18h Trabalho Operacional invadido por 1:1 urgente)       ║
║                                                              ║
║  ✏️  O que entregou hoje?                                    ║
║  ┌────────────────────────────────────────────────────┐    ║
║  │                                                    │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                              ║
║  ✏️  O que ficou aberto pra amanhã?                          ║
║  ┌────────────────────────────────────────────────────┐    ║
║  │                                                    │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                              ║
║  Sensação do dia:    ◯ 1   ◯ 2   ◯ 3   ◯ 4   ◯ 5            ║
║                                                              ║
║                                          [ Boa noite 🌙 ]    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Notas de design

- **Mobile-first.** Layout vertical, tudo legível na tela do celular.
- **Cor primária pra cada frente.** Permite identificação rápida visualmente.
- **Pictogramas pra Bússola.** 🎯 Importante / 🔥 Urgente / 💨 Disperso — fácil decorar.
- **Decisões em ≤2 toques.** Swipe, default em 60s, sugestões pré-preenchidas.
- **Linguagem humana, não corporativa.** "Bora começar" em vez de "Iniciar agenda".

## Próximos passos visuais (não pra V1)

- Versão **desktop** com matriz semanal expandida
- **Widget de tela inicial** mostrando bloco atual
- **Integração com Google Calendar** (importar reuniões automaticamente)
- **Notificação inteligente** no smartwatch (vibra quando bloco terminou)
- **Modo "coach por voz"** no carro/treino (lê os insights)
