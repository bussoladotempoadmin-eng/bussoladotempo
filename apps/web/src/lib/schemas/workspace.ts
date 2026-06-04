/**
 * Schema Zod das Configurações do Workspace — Etapa 16.
 * Esses valores alimentam o AgendaSuggester (janelas do dia).
 */
import { z } from 'zod';

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use um horário no formato HH:mm');

export const timezones = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Manaus',
  'America/Cuiaba',
  'America/Belem',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
] as const;

export const workspaceSchema = z
  .object({
    nome: z.string().trim().min(1, 'Dê um nome ao workspace').max(60),
    timezone: z.enum(timezones),
    semanaInicio: z.enum(['DOMINGO', 'SEGUNDA']),
    horaAcordar: hhmm,
    horaDormir: hhmm,
    horaAlmocoIni: hhmm,
    horaAlmocoFim: hhmm,
  })
  .refine((d) => d.horaDormir > d.horaAcordar, {
    message: 'A hora de dormir precisa ser depois de acordar',
    path: ['horaDormir'],
  })
  .refine((d) => d.horaAlmocoFim > d.horaAlmocoIni, {
    message: 'O fim do almoço precisa ser depois do início',
    path: ['horaAlmocoFim'],
  });

export type WorkspaceInput = z.infer<typeof workspaceSchema>;
