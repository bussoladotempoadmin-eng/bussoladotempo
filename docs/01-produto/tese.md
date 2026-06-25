# Bússola do Tempo — Tese V2

> Criado em 2026-05-25 durante conversa exploratória. **V2 atualizada em 25/05** com framework próprio: **Bússola do Tempo** (categorias: Importante / Urgente / Disperso).
> **Status:** ideia em validação. Sem código, sem app ainda.

> **Nota sobre o framework:** "Importante" e "Urgente" vêm da Matriz de Eisenhower (1954, domínio público). A 3ª categoria "Disperso" e o nome "Bússola do Tempo" são nomenclatura própria, inspirada conceitualmente na Tríade do Tempo de Christian Barbosa (Triad PS) — sem reivindicar marca dele.

---

## 🛠️ Decisões de produto (V2, 25/05/2026)

### Setup inicial — o que o usuário declara
1. **Frentes:** lista nomeada (Trabalho Operacional, Gestão Operacional, Agenda externa, Reuniões...). Configurável por usuário.
2. **Orçamento de horas/semana por frente:** ex. 36h + 18h + 2,5h + 2,5h.
3. **Compromissos fixos recorrentes:** lives, reuniões, treino, hora de dormir.

### Alocação dos blocos: **Sistema sugere, usuário aprova** (Opção A)
- Algoritmo distribui o orçamento de horas nos slots livres, respeitando compromissos fixos e âncoras (sono, almoço).
- Usuário arrasta pra ajustar.
- Não precisa de IA pesada — algoritmo simples.
- **Diferença vs Motion:** Motion otimiza tarefas; aqui otimizamos **frentes** (carga semanal por área).

### Granularidade da Bússola: **Classificação no BLOCO** (V1)
- Cada bloco do calendário tem 1 classificação (I / U / C).
- Toda atividade desse bloco herda a classificação.
- **Ajuste retroativo na revisão semanal:** se o bloco "Importante Trabalho Operacional" virou apenas emails, marca como Disperso na revisão.
- V2 pode adicionar override por tarefa pra quem quiser granularidade — mas só após validar valor.

### Hierarquia de frentes: **1 nível só** (V1)
- Cada frente é uma unidade indivisível: `Trabalho Operacional`, `Gestão Operacional`, `Agenda externa`, `Reuniões`.
- Sub-frentes (Gestão Operacional → Mentoria/CRM/Outros) ficam pra V2 como recurso **opcional**.
- Razão: quem está sufocado já tem dificuldade de classificar I/U/C. Adicionar hierarquia é convite pra abandono. Captura 80% do valor com 30% da complexidade.

### Planejamento da semana (Momento 2) — domingo, 15-20 min
4 passos:
1. **Encaixar compromissos novos** (reuniões marcadas pra próxima semana, eventos)
2. **Nomear entrega de cada bloco** ("Trabalho Operacional 8h-12h: revisar pipeline" — não lista de tarefas)
3. **Classificar cada bloco** como I/U/C (sistema sugere, usuário confirma)
4. **Definir 3 prioridades da semana** (marcam 3 blocos como âncoras)

### Classificação Bússola: **Ambas** (planejada + ajustada)
- Classificação inicial PROATIVA no domingo.
- AJUSTE RETROATIVO durante a semana quando bloco virou outra coisa.
- Relatório semanal mostra **planejado vs realizado** ("planejou 65% Importante; executou 42%"). Insight central.

### Uso do dia (Momento 3) — meio-termo "ativo gentil"
- **Manhã 2 min:** painel do dia (prioridades semanais + blocos + classificação). Só visualiza.
- **Durante o dia:** swipe rápido ao fim de cada bloco. ≤2s. Ignorar = "foi como planejado".
- **Noite 2 min:** fechamento — diferença planejado vs realizado + 2 perguntas livres + sensação 1-5.
- Notificação obrigatória só na manhã e noite. Swipe entre blocos é gentil/ignorável.

### Revisão semanal (Momento 4) — domingo, 30 min — O ESPELHO
4 partes:
1. **Matriz Frente × Bússola real** (planejado vs realizado, em percentuais e absolutos)
2. **Top 3 desvios** da semana (blocos que mais viraram outra coisa, com motivo registrado)
3. **Insights automáticos** entregues como **coach gentil** (linguagem humana, aponta padrões, sem ser invasivo) — diferencial real, construível com templates de linguagem
4. **Roteiro guiado** (4 perguntas curtas + 3 prioridades da próxima semana) que encadeia direto no Momento 2 (planejamento da próxima semana)

A revisão semanal **NÃO é trabalho** — é reflexão. UX precisa transmitir tranquilidade, não tela cheia de números.

### Adaptação a imprevistos (Momento 5) — sistema sugere realocação ativamente
4 cenários cobertos:
- **A) Reunião nova:** detecta conflito → sugere remarcar bloco original em 2-3 slots livres da semana respeitando orçamento da frente.
- **B) Bloco cancelado:** mostra frentes em atraso → sugere onde mover a hora liberada.
- **C) Urgência/incêndio:** botão flutuante "marcar bloco atual como invadido" → bloco vira "Urgente - invadido" no relatório (mantém o plano + o que virou).
- **D) Imprevisto grande (dia/meio-dia fora):** marca dia como "fora do plano" → sistema redistribui horas perdidas pelas próximas semanas. Sem culpa, adapta.

Princípio: **sistema atua, não pune.** Quanto mais a vida real desvia, mais o sistema deveria parecer **um amigo que ajuda a recolocar**, não um chefe que cobra.

### Versão piloto (planilha)
- Lucas conduz conversa de setup (~30min) com cada participante.
- Sai com planilha de agenda padrão **já preenchida**: blocos das frentes do mentorado nos dias da semana, classificados como I/U/C nos blocos.
- Mentorado vive a semana, ajusta na revisão semanal.
- Após 4 semanas → matriz Frente × Bússola real preenchida → **espelho** entregue.

---

## 🧭 Conceito central (V2)

**Matriz Frente × Categoria da Bússola do Tempo.**

Cada hora de trabalho é classificada em 2 eixos:
- **Frente:** Trabalho Operacional, Gestão Operacional, Agenda externa, Reuniões, ou outras (configurável por usuário).
- **Categoria (Bússola do Tempo):**
  - 🎯 **Importante:** estratégico, alinhado com objetivos, traz resultado real.
  - 🔥 **Urgente:** tem prazo apertado, exige ação imediata. Pode não ser importante.
  - 💨 **Disperso:** parece trabalho mas não gera resultado nem tem prazo real (reuniões inúteis, email sem propósito, atenção fragmentada).

A leitura da matriz vira o **espelho semanal** — o que o usuário NÃO vê em nenhuma outra ferramenta hoje.

### Exemplo de matriz semanal (caso Lucas)

| | Trabalho Operacional | Gestão Operacional | Agenda externa | Reuniões | **Total** |
|---|---|---|---|---|---|
| Importante | 14h | 12h | 1h | 1h | **28h (47%)** |
| Urgente | 18h | 4h | 1h | 1h | **24h (41%)** |
| Disperso | 4h | 2h | 30min | 30min | **7h (12%)** |
| **Total** | 36h | 18h | 2h30 | 2h30 | **59h** |

A leitura óbvia que vira valor: *"40% do meu tempo está em Urgente. 12% em Disperso = 1 dia útil jogado fora."*

---

---

## Origem da ideia

Em 24/05/2026, ao terminar de aprovar a agenda padrão semanal (59h distribuídas em 4 frentes), Lucas comentou:
> "Pensando nesse esquema já dá pra pensar em um sistema e app pra gerenciar tempo!"

A semente: o método que ele está vivendo na própria pele pode ser produtizado.

---

## Decisões estratégicas (25/05/2026)

### Caminho escolhido: validar com mentorados Gestão Operacional primeiro
- **Rejeitado:** SaaS mercado amplo (alto risco, sem validação)
- **Escolhido:** módulo/piloto interno na Gestão Operacional, escalar se funcionar
- **Lógica:** Lucas tem audiência cativa (mentorados Gestão Operacional) + CRM próprio (TriboCRM). Esse é o ativo. Começar fora dele é jogar fora vantagem.

### Perfil-alvo do piloto
- **Dono de negócio / empresário com múltiplas frentes** (parecido com Lucas)
- Vendedor individual entra em fase 2, não no piloto
- Critério: tem múltiplas frentes simultâneas + dor declarada de gerenciar o tempo

---

## Tese V2

| Item | Definição |
|---|---|
| **Dor central** | "Tenho controle do que precisa ser feito, mas a semana sempre escapa porque urgências dos outros sempre vencem minhas prioridades — e eu não consigo ver onde meu tempo de fato foi" |
| **Promessa do piloto** | "Em 4 semanas você vai SABER, com número, quanto do seu tempo vai pra cada frente e em qual categoria da Bússola do Tempo (Importante / Urgente / Disperso). E vai começar a mudar o que decide proteger." |
| **Hipóteses de valor (a validar)** | 1. **Matriz Frente × Bússola** como visão semanal — o "espelho"<br>2. Configurar frentes/projetos com orçamento de horas<br>3. Classificar cada bloco da agenda em Importante/Urgente/Disperso<br>4. **Relatório semanal** que mostra alinhamento vs estratégia declarada<br>5. Revisão semanal guiada com base nesses números |
| **Formato do piloto** | Grupo fechado, 5-7 pessoas, 4 semanas. **Sem app** — planilha (com a matriz já montada) + processo + Lucas como facilitador ao vivo |
| **Preço de filtro** | R$ 297 a R$ 497 (não pra lucrar — pra filtrar quem realmente quer) |
| **Critério de sucesso** | 5/7 sustentam o sistema na semana 4 + 3/7 dizem "pagaria todo mês" + ≥3/7 mudam comportamento concreto baseado no relatório (ex: cortam reunião Disperso) |

### O case ao vivo é o próprio Lucas
Lucas está construindo e vivendo o sistema agora (W22 25-31/05) → vira W23 (01-07/06 em diante). Os mentorados acompanham o caso real durante o piloto.

---

## Mercado conhecido (a sintetizar em benchmark)

Apps que existem hoje, **nenhum resolve bem o problema específico** "distribuir carga entre múltiplas frentes":

- Motion (IA reagenda automaticamente)
- Sunsama (daily planning ritual)
- Reclaim.ai (bloqueia hábitos automáticos)
- Akiflow (unifica inbox de tarefas)
- Amie / Routine (calendário bonito + tarefas)
- Notion Calendar / Cron (minimalista no ecossistema Notion)

> Claude vai entregar síntese 1-página/app até qua 27/05.

---

## Próximos passos (próximas 2 semanas)

### Entregas do Claude (até qua 27/05)
- [ ] Benchmark dos 6 apps
- [ ] Roteiro de entrevista de dor (30 min cada)
- [ ] Roteiro do piloto de 4 semanas

### Pendências do Lucas (até qui 28/05)
- [ ] Listar 5-7 mentorados-alvo (donos de negócio com múltiplas frentes)
- [ ] Reservar tempo para 5-7 conversas de 30 min em jun/jul
- [ ] **Não pitchar o produto** nessas conversas — só entrevistar a dor

### Riscos a vigiar
- **Viés do fundador:** Lucas pode achar que o problema dele é universal. Validação serve exatamente pra testar isso.
- **Frente nova competindo com 4 já ativas:** se o app virar 5ª frente ativa antes da agenda padrão funcionar (W23+), volta o problema original. Disciplina: nenhuma construção até o piloto provar tese.
- **Base pequena (≤20 mentorados):** queima de base se errar a abordagem. Conversa antes do convite ao piloto.
- **Licença/marca (RESOLVIDO em 25/05):** A Tríade do Tempo é marca do Christian Barbosa (Triad PS). Decidimos renomear pra **Bússola do Tempo** (framework) + **Disperso** (3ª categoria) — inspiração nele, marca própria nossa. "Importante" e "Urgente" vêm da Matriz de Eisenhower (livre).
- **Atrito de classificação:** se cadastrar tarefa pedir 3 cliques (frente + tríade + duração), o usuário desiste em 2 dias. Regra de ouro: classificação ≤2s por tarefa, ou virar default inteligente (bloco da agenda já vem pré-classificado, exceção é ajuste).

---

## Como esse projeto entra na agenda (Gestão Operacional)

As horas dedicadas a esse trabalho são **dentro do bloco Gestão Operacional (18h/sem)**, não em paralelo. Especialmente:
- Conversas com mentorados → tardes ter/qua ou bloco sábado
- Análise + tese → blocos Gestão Operacional das tardes
- **Nada à noite, nada no domingo, nada fora dos blocos protegidos**
