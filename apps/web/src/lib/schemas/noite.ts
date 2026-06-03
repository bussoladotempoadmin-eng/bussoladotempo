/**
 * Schema Zod do Fechamento da Noite — Etapa 13.
 */
import { z } from 'zod';

export const noiteSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  destaque: z.string().trim().max(1000).optional().default(''),
  aprendizado: z.string().trim().max(1000).optional().default(''),
  nota: z.coerce.number().int().min(1).max(5).nullable().optional(),
});

export type NoiteInput = z.infer<typeof noiteSchema>;
