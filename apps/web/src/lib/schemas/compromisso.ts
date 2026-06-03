/**
 * Schemas Zod dos Compromissos Fixos — compartilhados entre API e formulários.
 * Etapa 5 do roadmap.
 */
import { z } from 'zod';

export const diaSemanaValues = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;
export const categoriaValues = ['IMPORTANTE', 'URGENTE', 'DISPERSO'] as const;

export type DiaSemana = (typeof diaSemanaValues)[number];
export type Categoria = (typeof categoriaValues)[number];

export const diaSemanaLabel: Record<DiaSemana, string> = {
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SAB: 'Sábado',
  DOM: 'Domingo',
};

export const categoriaLabel: Record<Categoria, string> = {
  IMPORTANTE: '🎯 Importante',
  URGENTE: '🔥 Urgente',
  DISPERSO: '💨 Disperso',
};

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use um horário no formato HH:mm');

export const compromissoSchema = z
  .object({
    diaSemana: z.enum(diaSemanaValues),
    horaInicio: hhmm,
    horaFim: hhmm,
    descricao: z
      .string()
      .trim()
      .min(1, 'Descreva o compromisso')
      .max(120, 'Máximo de 120 caracteres'),
    // string vazia do <select> "Nenhuma" vira null
    frenteId: z
      .union([z.string().min(1), z.literal('')])
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    categoria: z.enum(categoriaValues).default('IMPORTANTE'),
  })
  .refine((d) => d.horaFim > d.horaInicio, {
    message: 'A hora de fim precisa ser depois do início',
    path: ['horaFim'],
  });

export type CompromissoInput = z.infer<typeof compromissoSchema>;
