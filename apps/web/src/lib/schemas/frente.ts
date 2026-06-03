/**
 * Schemas Zod das Frentes — compartilhados entre API (back) e formulários (front).
 * Etapa 4 do roadmap.
 */
import { z } from 'zod';

export const frenteCreateSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Dê um nome pra frente')
    .max(60, 'Máximo de 60 caracteres'),
  icone: z.string().trim().min(1, 'Escolha um ícone').max(8).default('📌'),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB')
    .default('#3b82f6'),
  orcamentoHoras: z.coerce
    .number({ error: 'Informe um número de horas' })
    .min(0, 'Não pode ser negativo')
    .max(168, 'Uma semana só tem 168 horas')
    .default(0),
});

export const frenteUpdateSchema = frenteCreateSchema.partial().extend({
  ativa: z.boolean().optional(),
});

export const frentesReorderSchema = z.object({
  ordem: z.array(z.string().min(1)).min(1, 'Lista de ordem vazia'),
});

export type FrenteCreateInput = z.infer<typeof frenteCreateSchema>;
export type FrenteUpdateInput = z.infer<typeof frenteUpdateSchema>;
