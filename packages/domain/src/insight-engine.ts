/**
 * InsightEngine (Coach Gentil) — gera insights em linguagem humana a partir do
 * espelho da semana. Implementa a §9.3 da spec.
 *
 * Princípios de tom: nunca culpar, sempre dar próximo passo concreto, variar
 * templates pra não soar robótico (3 variações por regra). Função pura.
 */
import type { Categoria } from './agenda-suggester';
import type { EspelhoResult } from './espelho-calculator';

export type TipoInsight = 'GOOD' | 'WARN' | 'TIP' | 'NEUTRAL';

export interface Insight {
  tipo: TipoInsight;
  titulo: string;
  texto: string;
  frenteId?: string;
}

export interface FrenteInsight {
  id: string;
  nome: string;
  icone: string;
}

function pct(frac: number): number {
  return Math.round(frac * 100);
}

/** Escolhe uma variação de forma determinística (varia com os dados, sem random). */
function pick(variacoes: string[], seed: number): string {
  return variacoes[Math.abs(Math.floor(seed)) % variacoes.length];
}

interface GlobalRule {
  nome: string;
  aplica: (e: EspelhoResult) => boolean;
  build: (e: EspelhoResult) => Insight;
}

interface FrenteRule {
  nome: string;
  aplica: (e: EspelhoResult, frenteId: string) => boolean;
  build: (e: EspelhoResult, f: FrenteInsight) => Insight;
}

const globalRules: GlobalRule[] = [
  {
    nome: 'imp_alto',
    aplica: (e) => e.percentuaisPorCategoria.IMPORTANTE >= 0.5,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.IMPORTANTE);
      return {
        tipo: 'GOOD',
        titulo: '✅ Você viveu em Importante',
        texto: pick(
          [
            `${p}% da sua semana foi Importante — estratégia venceu reatividade. Mantenha o ritmo.`,
            `${p}% em Importante. Esse é o retrato de uma semana dirigida por decisão, não por incêndio. Continua assim.`,
            `Boa: ${p}% do tempo foi Importante. Você protegeu o que move o ponteiro. Repita a receita.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'imp_baixo',
    aplica: (e) => e.totalGeral > 0 && e.percentuaisPorCategoria.IMPORTANTE < 0.3,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.IMPORTANTE);
      return {
        tipo: 'WARN',
        titulo: '⚠️ Pouco tempo em Importante',
        texto: pick(
          [
            `Só ${p}% da semana foi Importante. A estratégia está perdendo pra urgência alheia — vale revisar o que protege seu deep work.`,
            `Apenas ${p}% em Importante. Olhe a agenda da próxima e blinde 2 ou 3 blocos antes que a semana os coma.`,
            `${p}% em Importante é pouco pro que você quer construir. Que bloco dá pra tornar inegociável semana que vem?`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'bombeiro',
    aplica: (e) => e.percentuaisPorCategoria.URGENTE >= 0.5,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.URGENTE);
      return {
        tipo: 'WARN',
        titulo: '🔥 Semana de bombeiro',
        texto: pick(
          [
            `${p}% Urgente. Você reagiu mais do que decidiu. Veja quais frentes consumiram urgência — costuma dar pra delegar ou redesenhar o pipeline.`,
            `${p}% da semana foi apagar incêndio. Vale mapear a origem: o que gerou tanta urgência e dá pra prevenir?`,
            `Muita reação: ${p}% Urgente. Um passo concreto: escolha 1 fonte recorrente de urgência e ataque a causa, não o sintoma.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'urgente_moderado',
    aplica: (e) =>
      e.percentuaisPorCategoria.URGENTE >= 0.3 && e.percentuaisPorCategoria.URGENTE < 0.5,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.URGENTE);
      return {
        tipo: 'TIP',
        titulo: '🟠 Urgência subindo',
        texto: pick(
          [
            `${p}% Urgente — ainda sob controle, mas de olho. Se passar de 50% vira semana de bombeiro.`,
            `Urgência em ${p}%. Bom momento pra prevenir: o que está quase virando incêndio?`,
            `${p}% em Urgente. Nada alarmante, mas vale uma checagem rápida do que pode escalar.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'disperso_alto',
    aplica: (e) => e.percentuaisPorCategoria.DISPERSO >= 0.2,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.DISPERSO);
      const h = e.totalPorCategoria.DISPERSO;
      return {
        tipo: 'WARN',
        titulo: '💨 Disperso alto',
        texto: pick(
          [
            `${p}% Disperso = ${h.toLocaleString('pt-BR')}h que pareceram trabalho mas não geraram resultado. Vale cortar reuniões e mensagens sem propósito.`,
            `${h.toLocaleString('pt-BR')}h em Disperso (${p}%). Escolha a reunião mais inútil da semana e remova-a da próxima.`,
            `Disperso em ${p}%. Esse é o tempo mais fácil de recuperar — comece cortando 1 compromisso de baixo retorno.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'disperso_baixo',
    aplica: (e) => e.totalGeral > 0 && e.percentuaisPorCategoria.DISPERSO < 0.05,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.DISPERSO);
      return {
        tipo: 'GOOD',
        titulo: '🎯 Pouco desperdício',
        texto: pick(
          [
            `Só ${p}% Disperso — sua semana teve quase zero gordura. Foco afiado.`,
            `${p}% em Disperso. Você cortou bem o que não gera resultado. Continua protegendo isso.`,
            `Disperso em ${p}%: praticamente todo o tempo foi pra algo que importa. Excelente.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'semana_equilibrada',
    aplica: (e) =>
      e.percentuaisPorCategoria.IMPORTANTE >= 0.4 &&
      e.percentuaisPorCategoria.URGENTE < 0.3 &&
      e.percentuaisPorCategoria.DISPERSO < 0.15,
    build: (e) => {
      const p = pct(e.percentuaisPorCategoria.IMPORTANTE);
      return {
        tipo: 'GOOD',
        titulo: '⚖️ Semana equilibrada',
        texto: pick(
          [
            `Importante alto (${p}%), urgência e dispersão baixas. Esse é o equilíbrio que sustenta o longo prazo.`,
            `Distribuição saudável: muita estratégia, pouco incêndio, quase nada de desperdício. Modelo de semana.`,
            `Boa proporção entre as três categorias. Anote o que fez essa semana funcionar — vale repetir.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'planejado_imp_caiu',
    aplica: (e) => e.comparativo.IMPORTANTE.delta <= -0.08,
    build: (e) => {
      const plan = pct(e.comparativo.IMPORTANTE.planejado);
      const real = pct(e.comparativo.IMPORTANTE.realizado);
      return {
        tipo: 'WARN',
        titulo: '📉 Importante planejado vazou',
        texto: pick(
          [
            `Planejou ${plan}% Importante, executou ${real}%. Identifique os blocos que viraram outra coisa — é onde a semana está vazando.`,
            `Caiu de ${plan}% pra ${real}% em Importante. Veja nos desvios o que atropelou seus blocos estratégicos.`,
            `${plan}% planejado vs ${real}% realizado em Importante. Que proteção faltou pra esses blocos sobreviverem?`,
          ],
          plan + real,
        ),
      };
    },
  },
  {
    nome: 'planejado_bateu',
    aplica: (e) =>
      e.comparativo.IMPORTANTE.planejado > 0 &&
      Math.abs(e.comparativo.IMPORTANTE.delta) <= 0.05,
    build: (e) => {
      const real = pct(e.comparativo.IMPORTANTE.realizado);
      return {
        tipo: 'GOOD',
        titulo: '🎯 Executou o que planejou',
        texto: pick(
          [
            `O Importante realizado (${real}%) bateu com o planejado. Sua intenção virou ação — disciplina rara.`,
            `Quase zero desvio entre planejado e realizado em Importante. Você fez o que disse que faria.`,
            `Plano e execução alinhados (${real}% Importante). Esse é o músculo que diferencia quem só planeja.`,
          ],
          real,
        ),
      };
    },
  },
  {
    nome: 'urgente_subiu',
    aplica: (e) => e.comparativo.URGENTE.delta >= 0.08,
    build: (e) => {
      const plan = pct(e.comparativo.URGENTE.planejado);
      const real = pct(e.comparativo.URGENTE.realizado);
      return {
        tipo: 'WARN',
        titulo: '📈 Urgência invadiu o plano',
        texto: pick(
          [
            `Urgente saltou de ${plan}% planejado pra ${real}% realizado. Algo entrou de fora — vale entender o quê.`,
            `Você planejou ${plan}% Urgente e viveu ${real}%. A diferença é o tamanho da invasão desta semana.`,
            `+${real - plan} pontos de Urgente além do previsto. Olhe os desvios: qual frente puxou isso?`,
          ],
          plan + real,
        ),
      };
    },
  },
  {
    nome: 'concentracao_frente',
    aplica: (e) => {
      if (e.totalGeral <= 0) return false;
      const maior = Math.max(...Object.values(e.totalPorFrente));
      return maior / e.totalGeral >= 0.6;
    },
    build: (e) => {
      const maiorFrac =
        Math.max(...Object.values(e.totalPorFrente)) / e.totalGeral;
      return {
        tipo: 'TIP',
        titulo: '🧭 Semana concentrada numa frente',
        texto: pick(
          [
            `${pct(maiorFrac)}% do tempo foi pra uma única frente. Se foi intencional, ótimo; se não, as outras frentes podem estar sendo negligenciadas.`,
            `Uma frente levou ${pct(maiorFrac)}% da semana. Vale checar se as demais não estão acumulando dívida.`,
            `Concentração alta (${pct(maiorFrac)}% numa frente). Pergunta honesta: foi escolha ou inércia?`,
          ],
          pct(maiorFrac),
        ),
      };
    },
  },
];

const frenteRules: FrenteRule[] = [
  {
    nome: 'frente_bombeiro',
    aplica: (e, id) => {
      const total = e.totalPorFrente[id] ?? 0;
      return total > 0 && (e.matriz.URGENTE[id] ?? 0) / total >= 0.6;
    },
    build: (e, f) => {
      const total = e.totalPorFrente[f.id];
      const p = pct((e.matriz.URGENTE[f.id] ?? 0) / total);
      return {
        tipo: 'WARN',
        frenteId: f.id,
        titulo: `⚠️ ${f.icone} ${f.nome} virou bombeiro`,
        texto: pick(
          [
            `${p}% Urgente nessa frente. Vale delegar, redesenhar o pipeline de demanda, ou assumir conscientemente que ela é sua frente reativa.`,
            `${f.nome} está ${p}% reativa. Qual parte dessa urgência é estrutural e dá pra prevenir?`,
            `${p}% de ${f.nome} foi apagar incêndio. Um passo: mapeie a origem mais frequente e ataque a causa.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'frente_protegida',
    aplica: (e, id) => {
      const total = e.totalPorFrente[id] ?? 0;
      return total > 0 && (e.matriz.IMPORTANTE[id] ?? 0) / total >= 0.7;
    },
    build: (e, f) => {
      const total = e.totalPorFrente[f.id];
      const p = pct((e.matriz.IMPORTANTE[f.id] ?? 0) / total);
      return {
        tipo: 'GOOD',
        frenteId: f.id,
        titulo: `🎯 ${f.icone} ${f.nome} bem protegida`,
        texto: pick(
          [
            `${p}% Importante nessa frente. Você está investindo bem onde provavelmente está seu maior ROI estratégico.`,
            `${f.nome} rodou ${p}% em Importante. Estratégia protegida — mantenha.`,
            `Boa: ${p}% de ${f.nome} foi trabalho que importa. Esse é o tipo de frente que constrói futuro.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'frente_disperso',
    aplica: (e, id) => {
      const total = e.totalPorFrente[id] ?? 0;
      return total > 0 && (e.matriz.DISPERSO[id] ?? 0) / total >= 0.4;
    },
    build: (e, f) => {
      const total = e.totalPorFrente[f.id];
      const p = pct((e.matriz.DISPERSO[f.id] ?? 0) / total);
      return {
        tipo: 'WARN',
        frenteId: f.id,
        titulo: `💨 ${f.icone} ${f.nome} dispersando`,
        texto: pick(
          [
            `${p}% de ${f.nome} foi Disperso. Essa frente pede uma faxina: o que dá pra cortar sem perder resultado?`,
            `${f.nome} teve ${p}% Disperso. Talvez ela mereça menos horas — ou horas melhor usadas.`,
            `Quase metade de ${f.nome} (${p}%) virou dispersão. Vale repensar o formato dos compromissos dela.`,
          ],
          p,
        ),
      };
    },
  },
  {
    nome: 'frente_pulverizada',
    aplica: (e, id) => {
      const total = e.totalPorFrente[id] ?? 0;
      // frente ativa com muito pouco tempo (migalha) — pode estar pulverizada
      return total > 0 && total < 2;
    },
    build: (e, f) => {
      const total = e.totalPorFrente[f.id];
      return {
        tipo: 'TIP',
        frenteId: f.id,
        titulo: `🔎 ${f.icone} ${f.nome} com pouquíssimo tempo`,
        texto: pick(
          [
            `${f.nome} teve só ${total.toLocaleString('pt-BR')}h. Tempo migalha raramente gera resultado — vale agrupar em um bloco maior ou aceitar que é manutenção.`,
            `Apenas ${total.toLocaleString('pt-BR')}h em ${f.nome}. Se ela importa, dê um bloco decente; se não, tudo bem deixá-la pequena de propósito.`,
            `${f.nome} ficou com ${total.toLocaleString('pt-BR')}h pulverizadas. Concentrar costuma render mais que espalhar.`,
          ],
          Math.round(total * 10),
        ),
      };
    },
  },
];

export function gerarInsights(
  espelho: EspelhoResult,
  frentes: FrenteInsight[],
): Insight[] {
  if (espelho.totalGeral <= 0) {
    return [
      {
        tipo: 'NEUTRAL',
        titulo: '🧭 Sem dados ainda',
        texto:
          'Registre os blocos da semana pra eu te mostrar onde seu tempo realmente foi.',
      },
    ];
  }

  const insights: Insight[] = [];

  for (const regra of globalRules) {
    if (regra.aplica(espelho)) insights.push(regra.build(espelho));
  }

  for (const f of frentes) {
    for (const regra of frenteRules) {
      if (regra.aplica(espelho, f.id)) insights.push(regra.build(espelho, f));
    }
  }

  if (insights.length === 0) {
    insights.push({
      tipo: 'NEUTRAL',
      titulo: '🧭 Semana sem alertas',
      texto:
        'Nada gritou nos números desta semana. Use o espelho pra escolher conscientemente o foco da próxima.',
    });
  }

  return insights;
}
