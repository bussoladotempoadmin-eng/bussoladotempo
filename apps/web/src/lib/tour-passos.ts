/**
 * Passos do tour guiado, por tela. Cada passo ilumina um elemento real
 * (data-tour) ou, se não tiver alvo, vira um card centralizado.
 *
 * Reverter o onboarding inteiro: troque TOUR_MODO.
 *   'guiado' = spotlight | 'cards' = cards | 'off' = nenhum
 */
export type Passo = { target?: string; abrirMenu?: boolean; titulo: string; texto: string };

export const TOUR_MODO: 'guiado' | 'cards' | 'off' = 'guiado';

export const PASSOS_HOME: Passo[] = [
  { titulo: 'Bem-vindo à Bússola 🧭', texto: 'Em 30 segundos te mostro onde fica cada coisa. Pode pular quando quiser.' },
  { target: '[data-tour="menu"]', titulo: 'Seu menu', texto: 'No seu nome ficam todas as suas seções. Vou te mostrar as principais.' },
  { target: '[data-tour="menu-frentes"]', abrirMenu: true, titulo: 'Frentes', texto: 'Comece por aqui: cadastre suas áreas de atuação. Tudo se organiza por elas.' },
  { target: '[data-tour="menu-semana"]', abrirMenu: true, titulo: 'Sua semana', texto: 'É onde você monta a semana com a IA e ajusta seus blocos.' },
  { target: '[data-tour="menu-revisao"]', abrirMenu: true, titulo: 'Revisão', texto: 'De sexta a domingo, revise como foi e já planeje a próxima.' },
  { titulo: 'Conclua suas demandas ✅', texto: 'Ao terminar um bloco, toque em “Concluir”: diga quando foi e se saiu como planejado, virou urgente ou foi disperso.' },
  { titulo: 'Pronto pra começar 🚀', texto: 'Bom proveito! Você pode rever este tour quando quiser.' },
];

export const PASSOS_SEMANA: Passo[] = [
  { titulo: 'Sua semana', texto: 'Aqui você vê e organiza todos os blocos da semana, dia a dia.' },
  { target: '[data-tour="semana-novo"]', titulo: 'Adicionar bloco', texto: 'Crie um bloco manualmente aqui — horário, frente e categoria.' },
  { titulo: 'Montar com IA ✨', texto: 'Com a semana vazia, a IA monta tudo pra você num toque, a partir das suas frentes.' },
  { titulo: 'Concluir e dizer como foi ✅', texto: 'Toque num bloco pra abrir, adicionar tarefas e marcar “Concluir” (planejado / urgente / disperso).' },
];

export const PASSOS_FRENTES: Passo[] = [
  { titulo: 'Suas frentes', texto: 'Frentes são suas áreas de atuação. Tudo na sua semana se organiza por elas.' },
  { target: '[data-tour="frente-nova"]', titulo: 'Nova frente', texto: 'Crie uma nova área aqui — dê um nome, ícone e cor.' },
  { titulo: 'Orçamento de horas ⏳', texto: 'Defina quantas horas/semana quer dar a cada frente. A IA respeita esse limite ao montar a semana.' },
];

/** Acha os passos da rota atual (por prefixo). null = sem tour pra essa tela. */
export function passosParaRota(rota: string): Passo[] | null {
  if (rota === '/') return PASSOS_HOME;
  if (rota.startsWith('/semana')) return PASSOS_SEMANA;
  if (rota.startsWith('/frentes')) return PASSOS_FRENTES;
  return null;
}
