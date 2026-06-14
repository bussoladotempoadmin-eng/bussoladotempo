/**
 * Filtro de período (De/Até) com calendário nativo.
 * Form GET puro: recarrega a página server-side com os searchParams.
 * `extras` preserva outros parâmetros (ex: tipo de relatório, status).
 */
export function DateFilter({
  de,
  ate,
  extras,
}: {
  de: string;
  ate: string;
  extras?: Record<string, string>;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">De</span>
          <input type="date" name="de" defaultValue={de} className="bg-transparent text-sm font-semibold outline-none" />
        </label>
        <span className="pb-1 text-muted-foreground">→</span>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Até</span>
          <input type="date" name="ate" defaultValue={ate} className="bg-transparent text-sm font-semibold outline-none" />
        </label>
      </div>
      {extras &&
        Object.entries(extras).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted"
      >
        Aplicar
      </button>
    </form>
  );
}
