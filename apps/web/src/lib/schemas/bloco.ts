/**
 * Schemas Zod dos Blocos da Semana — compartilhados entre API e formulários.
 * Etapa 7 do roadmap.
 */
import { z } from 'zod';
import { diaSemanaValues, categoriaValues } from './compromisso';

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use um horário no formato HH:mm');

export const isoSemanaRegex = /^\d{4}-W\d{2}$/;

const camposBloco = z.object({
  diaSemana: z.enum(diaSemanaValues),
  horaInicio: hhmm,
  horaFim: hhmm,
  tarefa: z.string().trim().min(1, 'Descreva a tarefa').max(200, 'Máximo de 200 caracteres'),
  frenteId: z.string().min(1, 'Escolha uma frente'),
  categoriaPlanejada: z.enum(categoriaValues).default('IMPORTANTE'),
  categoriaRealizada: z.enum(categoriaValues).optional(),
});

const horariosValidos = (d: { horaInicio: string; horaFim: string }) =>
  d.horaFim > d.horaInicio;
const horarioErro = {
  message: 'A hora de fim precisa ser depois do início',
  path: ['horaFim'],
};

export const blocoCreateSchema = camposBloco
  .extend({
    semanaIso: z.string().regex(isoSemanaRegex, 'Semana inválida'),
  })
  .refine(horariosValidos, horarioErro);

export const blocoUpdateSchema = camposBloco.refine(horariosValidos, horarioErro);

export type BlocoCreateInput = z.infer<typeof blocoCreateSchema>;
export type BlocoUpdateInput = z.infer<typeof blocoUpdateSchema>;
