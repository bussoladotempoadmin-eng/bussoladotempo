/**
 * Seed — popula o banco com o caso Lucas (caso 0) já validado na Fase 0.
 *
 * Cria:
 * - 1 User (Lucas)
 * - 1 Workspace dele com configs (timezone, sono, almoço)
 * - 4 Frentes: Doctum, Tribo, Dra. Bruna, CuidaJA
 * - Compromissos fixos: treino seg-sex, mentoria seg, live qui
 * - 1 SemanaPlano para 2026-W24 (08-14/06) com ~24 blocos
 *
 * Rode com: pnpm --filter db seed
 */

import { readFileSync } from 'node:fs';
import { PrismaClient, Categoria, DiaSemana, FonteOrigem, StatusSemana } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Carrega DATABASE_URL do .env do pacote db, se ainda não estiver no ambiente.
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
      if (m) process.env.DATABASE_URL = m[1];
    }
  } catch {
    /* ignora */
  }
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const LUCAS_EMAIL = 'lucas.ctga.silveira@gmail.com';
const LUCAS_NOME = 'Lucas Silveira';
const SEMANA_ISO = '2026-W24'; // semana de 08-14/06/2026

type SeedBloco = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  frenteKey: 'doctum' | 'tribo' | 'bruna' | 'cuidaja';
  tarefa: string;
  categoriaPlanejada: Categoria;
  categoriaRealizada: Categoria;
  prioridadeSemana?: number;
};

const blocosSeed: SeedBloco[] = [
  // SEGUNDA
  { diaSemana: 'SEG', horaInicio: '08:00', horaFim: '12:00', frenteKey: 'doctum', tarefa: 'Revisar pipeline + alinhar marketing', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE', prioridadeSemana: 1 },
  { diaSemana: 'SEG', horaInicio: '13:30', horaFim: '18:00', frenteKey: 'doctum', tarefa: '1:1 vendedor X + ajustes', categoriaPlanejada: 'URGENTE', categoriaRealizada: 'URGENTE' },
  { diaSemana: 'SEG', horaInicio: '18:30', horaFim: '21:30', frenteKey: 'tribo', tarefa: '🎤 Mentoria ao vivo - aula 04', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE', prioridadeSemana: 2 },

  // TERÇA
  { diaSemana: 'TER', horaInicio: '08:00', horaFim: '12:00', frenteKey: 'doctum', tarefa: 'Reunião comitê + revisar metas', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' },
  { diaSemana: 'TER', horaInicio: '13:30', horaFim: '14:00', frenteKey: 'bruna', tarefa: 'Status semanal Dra. Bruna', categoriaPlanejada: 'DISPERSO', categoriaRealizada: 'DISPERSO' },
  { diaSemana: 'TER', horaInicio: '14:00', horaFim: '14:30', frenteKey: 'cuidaja', tarefa: 'Status CuidaJA', categoriaPlanejada: 'DISPERSO', categoriaRealizada: 'DISPERSO' },
  { diaSemana: 'TER', horaInicio: '14:30', horaFim: '17:00', frenteKey: 'tribo', tarefa: 'Gravar aula 05 mentoria', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'TER', horaInicio: '17:00', horaFim: '19:00', frenteKey: 'doctum', tarefa: 'Email + alinhamentos', categoriaPlanejada: 'DISPERSO', categoriaRealizada: 'DISPERSO' },

  // QUARTA
  { diaSemana: 'QUA', horaInicio: '08:00', horaFim: '12:00', frenteKey: 'doctum', tarefa: 'Reuniões com clientes + forecast', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' },
  { diaSemana: 'QUA', horaInicio: '13:30', horaFim: '14:00', frenteKey: 'bruna', tarefa: 'Revisar material aula Dra. Bruna', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'QUA', horaInicio: '14:00', horaFim: '14:30', frenteKey: 'cuidaja', tarefa: 'CuidaJA - mensagens / alinhamento', categoriaPlanejada: 'DISPERSO', categoriaRealizada: 'DISPERSO' },
  { diaSemana: 'QUA', horaInicio: '14:30', horaFim: '17:00', frenteKey: 'tribo', tarefa: 'TriboCRM - revisar funcionalidades', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'QUA', horaInicio: '17:00', horaFim: '19:00', frenteKey: 'doctum', tarefa: 'Doctum - administrativo', categoriaPlanejada: 'DISPERSO', categoriaRealizada: 'DISPERSO' },

  // QUINTA
  { diaSemana: 'QUI', horaInicio: '08:00', horaFim: '12:00', frenteKey: 'doctum', tarefa: 'Workshop com time de vendas', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'QUI', horaInicio: '13:30', horaFim: '17:30', frenteKey: 'doctum', tarefa: 'Reuniões 1:1 + planejamento', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' },
  { diaSemana: 'QUI', horaInicio: '18:00', horaFim: '21:00', frenteKey: 'tribo', tarefa: '📺 Live Tribo', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },

  // SEXTA
  { diaSemana: 'SEX', horaInicio: '08:00', horaFim: '12:00', frenteKey: 'doctum', tarefa: 'Fechamento semana + relatórios', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'URGENTE' },
  { diaSemana: 'SEX', horaInicio: '13:30', horaFim: '14:30', frenteKey: 'bruna', tarefa: 'Reunião Dra. Bruna - revisão semana', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE', prioridadeSemana: 3 },
  { diaSemana: 'SEX', horaInicio: '14:30', horaFim: '15:30', frenteKey: 'cuidaja', tarefa: 'Reunião CuidaJA - revisão semana', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'SEX', horaInicio: '15:30', horaFim: '19:00', frenteKey: 'doctum', tarefa: 'Doctum - fechamento + emails', categoriaPlanejada: 'URGENTE', categoriaRealizada: 'URGENTE' },

  // SÁBADO
  { diaSemana: 'SAB', horaInicio: '08:00', horaFim: '13:00', frenteKey: 'tribo', tarefa: 'Tribo - estratégia + produto', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'SAB', horaInicio: '13:00', horaFim: '13:30', frenteKey: 'bruna', tarefa: 'Bruna - preparar semana', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'SAB', horaInicio: '13:30', horaFim: '14:00', frenteKey: 'cuidaja', tarefa: 'CuidaJA - preparar semana', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
  { diaSemana: 'SAB', horaInicio: '14:00', horaFim: '16:00', frenteKey: 'tribo', tarefa: 'Tribo - conteúdo / produto', categoriaPlanejada: 'IMPORTANTE', categoriaRealizada: 'IMPORTANTE' },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // ============ User ============
  const user = await prisma.user.upsert({
    where: { email: LUCAS_EMAIL },
    update: {},
    create: {
      email: LUCAS_EMAIL,
      name: LUCAS_NOME,
      emailVerified: new Date(),
    },
  });
  console.log(`✓ User: ${user.name} (${user.email})`);

  // ============ Workspace ============
  let workspace = await prisma.workspace.findFirst({
    where: { userId: user.id },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        userId: user.id,
        nome: 'Bússola do Lucas',
        timezone: 'America/Sao_Paulo',
        semanaInicio: 'SEGUNDA',
        horaAcordar: '06:00',
        horaDormir: '22:30',
        horaAlmocoIni: '12:00',
        horaAlmocoFim: '13:30',
      },
    });
  }
  console.log(`✓ Workspace: ${workspace.nome}`);

  // ============ Frentes ============
  // Limpa frentes anteriores pra recriar com ordem certa
  await prisma.frente.deleteMany({ where: { workspaceId: workspace.id } });

  const doctum = await prisma.frente.create({
    data: {
      workspaceId: workspace.id,
      nome: 'Doctum',
      icone: '🏢',
      cor: '#3b82f6',
      orcamentoHoras: 36,
      ordem: 0,
    },
  });
  const tribo = await prisma.frente.create({
    data: {
      workspaceId: workspace.id,
      nome: 'Tribo',
      icone: '🛒',
      cor: '#f97316',
      orcamentoHoras: 18,
      ordem: 1,
    },
  });
  const bruna = await prisma.frente.create({
    data: {
      workspaceId: workspace.id,
      nome: 'Dra. Bruna',
      icone: '🎓',
      cor: '#a855f7',
      orcamentoHoras: 2.5,
      ordem: 2,
    },
  });
  const cuidaja = await prisma.frente.create({
    data: {
      workspaceId: workspace.id,
      nome: 'CuidaJA',
      icone: '🤝',
      cor: '#22c55e',
      orcamentoHoras: 2.5,
      ordem: 3,
    },
  });
  console.log(`✓ Frentes: Doctum, Tribo, Dra. Bruna, CuidaJA (total ${36 + 18 + 2.5 + 2.5}h/sem)`);

  const frentes = { doctum, tribo, bruna, cuidaja };

  // ============ Compromissos fixos ============
  await prisma.compromissoFixo.deleteMany({ where: { workspaceId: workspace.id } });

  const compromissosBase = [
    { diaSemana: 'SEG' as DiaSemana, horaInicio: '07:00', horaFim: '08:00', descricao: 'Treino', categoria: 'IMPORTANTE' as Categoria },
    { diaSemana: 'TER' as DiaSemana, horaInicio: '07:00', horaFim: '08:00', descricao: 'Treino', categoria: 'IMPORTANTE' as Categoria },
    { diaSemana: 'QUA' as DiaSemana, horaInicio: '07:00', horaFim: '08:00', descricao: 'Treino', categoria: 'IMPORTANTE' as Categoria },
    { diaSemana: 'QUI' as DiaSemana, horaInicio: '07:00', horaFim: '08:00', descricao: 'Treino', categoria: 'IMPORTANTE' as Categoria },
    { diaSemana: 'SEX' as DiaSemana, horaInicio: '07:00', horaFim: '08:00', descricao: 'Treino', categoria: 'IMPORTANTE' as Categoria },
    { diaSemana: 'SEG' as DiaSemana, horaInicio: '18:30', horaFim: '21:30', descricao: 'Mentoria Tribo (ao vivo)', frenteId: tribo.id, categoria: 'IMPORTANTE' as Categoria },
    { diaSemana: 'QUI' as DiaSemana, horaInicio: '18:00', horaFim: '21:00', descricao: 'Live Tribo', frenteId: tribo.id, categoria: 'IMPORTANTE' as Categoria },
  ];
  for (const c of compromissosBase) {
    await prisma.compromissoFixo.create({
      data: { workspaceId: workspace.id, ...c },
    });
  }
  console.log(`✓ Compromissos fixos: ${compromissosBase.length}`);

  // ============ SemanaPlano + Blocos ============
  await prisma.semanaPlano.deleteMany({
    where: { workspaceId: workspace.id, semanaIso: SEMANA_ISO },
  });

  const semana = await prisma.semanaPlano.create({
    data: {
      workspaceId: workspace.id,
      semanaIso: SEMANA_ISO,
      status: 'ATIVA' as StatusSemana,
      riscoSemana: 'Quinta tem reunião emergencial do CEO marcada — pode invadir bloco Tribo da tarde.',
    },
  });

  const blocoIds: Record<number, string> = {};
  for (const b of blocosSeed) {
    const frente = frentes[b.frenteKey];
    const bloco = await prisma.bloco.create({
      data: {
        semanaPlanoId: semana.id,
        frenteId: frente.id,
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio,
        horaFim: b.horaFim,
        tarefa: b.tarefa,
        categoriaPlanejada: b.categoriaPlanejada,
        categoriaRealizada: b.categoriaRealizada,
        prioridadeSemana: b.prioridadeSemana ?? null,
        fonteOrigem: 'AGENDA_PADRAO' as FonteOrigem,
      },
    });
    if (b.prioridadeSemana) {
      blocoIds[b.prioridadeSemana] = bloco.id;
    }
  }

  // Linka prioridades 1/2/3 no SemanaPlano
  await prisma.semanaPlano.update({
    where: { id: semana.id },
    data: {
      prioridade1: blocoIds[1] ?? null,
      prioridade2: blocoIds[2] ?? null,
      prioridade3: blocoIds[3] ?? null,
    },
  });

  console.log(`✓ Semana ${SEMANA_ISO}: ${blocosSeed.length} blocos criados`);

  console.log('\n🎉 Seed concluído.');
  console.log(`   User: ${LUCAS_EMAIL}`);
  console.log(`   Workspace: ${workspace.nome}`);
  console.log(`   Frentes: 4`);
  console.log(`   Compromissos: ${compromissosBase.length}`);
  console.log(`   Semana atual: ${SEMANA_ISO} (${blocosSeed.length} blocos)`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
