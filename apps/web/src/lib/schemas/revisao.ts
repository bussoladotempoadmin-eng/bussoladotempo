/**
 * Schema Zod da Revisão Semanal — Etapa 10.
 * Os 4 campos livres da retro + sensação (1-5) + preparo da próxima semana
 * (risco + 3 prioridades).
 */
import { z } from 'zod';

const texto = z.string().trim().max(1000).optional().default('');

export const revisaoSchema = z.object({
  retroFuncionou: texto,
  retroNaoFuncionou: texto,
  retroMudanca: texto,
  sensacaoMedia: z.coerce.number().int().min(1).max(5).nullable().optional(),
  riscoProxima: texto,
  prioridadesProxima: z
    .array(z.string().trim().max(200))
    .max(3)
    .optional()
    .default([]),
  fechar: z.boolean().optional().default(false),
});

export type RevisaoInput = z.infer<typeof revisaoSchema>;
