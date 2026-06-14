import Link from 'next/link';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NudgeRevisao } from '@/lib/nudge-revisao';

export function NudgeBanner({ nudge }: { nudge: NudgeRevisao }) {
  const grace = nudge.tom === 'grace';
  return (
    <Link
      href={`/revisao/${nudge.iso}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        grace
          ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15'
          : 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/15',
      )}
    >
      <CalendarClock
        className={cn('h-5 w-5 shrink-0', grace ? 'text-amber-500' : 'text-sky-500')}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold', grace ? 'text-amber-700 dark:text-amber-400' : 'text-sky-700 dark:text-sky-400')}>
          {nudge.titulo}
        </p>
        <p className="text-xs text-muted-foreground">
          {nudge.texto} <span className="opacity-70">({nudge.label})</span>
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
        Revisar agora
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
