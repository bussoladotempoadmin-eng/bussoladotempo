'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import { frenteCreateSchema } from '@/lib/schemas/frente';
import {
  compromissoSchema,
  diaSemanaValues,
  diaSemanaLabel,
  type DiaSemana,
} from '@/lib/schemas/compromisso';

export type WizardWorkspace = {
  nome: string;
  timezone: string;
  semanaInicio: 'DOMINGO' | 'SEGUNDA';
  horaAcordar: string;
  horaDormir: string;
  horaAlmocoIni: string;
  horaAlmocoFim: string;
};

const CORES = ['#3b82f6', '#f97316', '#a855f7', '#22c55e', '#ef4444', '#14b8a6', '#eab308', '#ec4899'];
const PASSOS = ['Seu ritmo', 'Frentes', 'Compromissos', 'Sua semana'];

type FrenteLocal = { id: string; nome: string; icone: string; cor: string; orcamentoHoras: number };

export function OnboardingWizard({
  primeiroNome,
  workspace,
  semanaIso,
}: {
  primeiroNome: string;
  workspace: WizardWorkspace;
  semanaIso: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // passo 0 — ritmo
  const [ws, setWs] = React.useState<WizardWorkspace>(workspace);
  // passo 1 — frentes
  const [frentes, setFrentes] = React.useState<FrenteLocal[]>([]);
  const [novaFrente, setNovaFrente] = React.useState({ nome: '', horas: '' });
  // passo 2 — compromissos
  const [comps, setComps] = React.useState<
    { id: string; diaSemana: DiaSemana; horaInicio: string; horaFim: string; descricao: string }[]
  >([]);
  const [novoComp, setNovoComp] = React.useState({
    diaSemana: 'SEG' as DiaSemana,
    horaInicio: '07:00',
    horaFim: '08:00',
    descricao: '',
  });
  // passo 3 — resultado
  const [aplicado, setAplicado] = React.useState<number | null>(null);

  async function salvarRitmo() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ws),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Confira os horários (o fim do almoço precisa ser depois do início).');
      return false;
    }
    return true;
  }

  async function addFrente() {
    setError(null);
    const cor = CORES[frentes.length % CORES.length];
    const parsed = frenteCreateSchema.safeParse({
      nome: novaFrente.nome,
      orcamentoHoras: novaFrente.horas || '0',
      cor,
      icone: '📌',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/frentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui criar a frente.');
      return;
    }
    const f = await res.json();
    setFrentes((prev) => [...prev, { id: f.id, nome: f.nome, icone: f.icone, cor: f.cor, orcamentoHoras: f.orcamentoHoras }]);
    setNovaFrente({ nome: '', horas: '' });
  }

  async function removerFrente(id: string) {
    await fetch(`/api/frentes/${id}`, { method: 'DELETE' });
    setFrentes((prev) => prev.filter((f) => f.id !== id));
  }

  async function addComp() {
    setError(null);
    const parsed = compromissoSchema.safeParse(novoComp);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/compromissos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui criar o compromisso.');
      return;
    }
    const c = await res.json();
    setComps((prev) => [...prev, { id: c.id, diaSemana: c.diaSemana, horaInicio: c.horaInicio, horaFim: c.horaFim, descricao: c.descricao }]);
    setNovoComp({ ...novoComp, descricao: '' });
  }

  async function gerarSemana() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/agenda-padrao/aplicar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semanaIso, substituir: true }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Não consegui gerar a semana. Você pode fazer isso depois na Agenda padrão.');
      return;
    }
    const d = await res.json();
    setAplicado(d.count);
    setStep(4);
  }

  async function proximo() {
    if (step === 0) {
      if (!(await salvarRitmo())) return;
    }
    if (step === 1 && frentes.length === 0) {
      setError('Crie pelo menos uma frente pra continuar.');
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  const field = 'rounded-lg border border-border bg-background px-3 py-2 text-sm';

  // Tela final
  if (step === 4) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <PartyPopper className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold">Tudo pronto! 🧭</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {aplicado ? `Sua semana ganhou ${aplicado} blocos. ` : ''}Bora pro seu painel.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-6 inline-flex rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ir pro Painel do Dia
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
      <div className="mb-5 flex items-center gap-2 text-lg font-bold">
        <Compass className="h-6 w-6 text-primary" />
        Bússola do Tempo
      </div>

      {/* stepper */}
      <ol className="mb-6 flex items-center gap-1.5 text-[11px]">
        {PASSOS.map((p, i) => (
          <li key={p} className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full font-bold ${
                i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={i === step ? 'font-semibold' : 'text-muted-foreground'}>{p}</span>
            {i < PASSOS.length - 1 && <span className="text-muted-foreground">·</span>}
          </li>
        ))}
      </ol>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* PASSO 0 — ritmo */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold">
              {primeiroNome ? `Olá, ${primeiroNome}! ` : 'Olá! '}Vamos calibrar seu dia
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              É com esses horários que a Bússola decide onde encaixar seus blocos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Acordo às
              <input type="time" value={ws.horaAcordar} onChange={(e) => setWs({ ...ws, horaAcordar: e.target.value })} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Durmo às
              <input type="time" value={ws.horaDormir} onChange={(e) => setWs({ ...ws, horaDormir: e.target.value })} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Almoço — início
              <input type="time" value={ws.horaAlmocoIni} onChange={(e) => setWs({ ...ws, horaAlmocoIni: e.target.value })} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Almoço — fim
              <input type="time" value={ws.horaAlmocoFim} onChange={(e) => setWs({ ...ws, horaAlmocoFim: e.target.value })} className={field} />
            </label>
          </div>
        </div>
      )}

      {/* PASSO 1 — frentes */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold">Suas frentes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              As áreas em que você divide seu tempo (ex: a empresa, um projeto, um cliente). Dê um orçamento de horas/semana pra cada.
            </p>
          </div>
          <ul className="space-y-2">
            {frentes.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: f.cor }} />
                <span className="flex-1 text-sm font-medium">{f.nome}</span>
                <span className="text-xs text-muted-foreground">{f.orcamentoHoras}h/sem</span>
                <button type="button" onClick={() => removerFrente(f.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Nome
              <input
                value={novaFrente.nome}
                onChange={(e) => setNovaFrente({ ...novaFrente, nome: e.target.value })}
                placeholder="Ex: Doctum"
                className={field}
              />
            </label>
            <label className="flex w-24 flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Horas/sem
              <input
                value={novaFrente.horas}
                onChange={(e) => setNovaFrente({ ...novaFrente, horas: e.target.value })}
                inputMode="decimal"
                placeholder="0"
                className={field}
              />
            </label>
            <button
              type="button"
              onClick={addFrente}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 2 — compromissos */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold">Compromissos fixos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              O que se repete em horário travado toda semana (treino, reunião fixa, live). Opcional — pode pular.
            </p>
          </div>
          {comps.length > 0 && (
            <ul className="space-y-1.5">
              {comps.map((c) => (
                <li key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-semibold">{diaSemanaLabel[c.diaSemana]}</span> {c.horaInicio}–{c.horaFim} · {c.descricao}
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={novoComp.diaSemana}
              onChange={(e) => setNovoComp({ ...novoComp, diaSemana: e.target.value as DiaSemana })}
              className={field}
            >
              {diaSemanaValues.map((d) => (
                <option key={d} value={d}>
                  {diaSemanaLabel[d]}
                </option>
              ))}
            </select>
            <input
              value={novoComp.descricao}
              onChange={(e) => setNovoComp({ ...novoComp, descricao: e.target.value })}
              placeholder="Ex: Treino"
              className={field}
            />
            <input type="time" value={novoComp.horaInicio} onChange={(e) => setNovoComp({ ...novoComp, horaInicio: e.target.value })} className={field} />
            <input type="time" value={novoComp.horaFim} onChange={(e) => setNovoComp({ ...novoComp, horaFim: e.target.value })} className={field} />
          </div>
          <button
            type="button"
            onClick={addComp}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Adicionar compromisso
          </button>
        </div>
      )}

      {/* PASSO 3 — gerar semana */}
      {step === 3 && (
        <div className="space-y-4 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-xl font-extrabold">Pronto pra montar sua semana?</h1>
          <p className="text-sm text-muted-foreground">
            Vou distribuir suas {frentes.length} frentes nas janelas livres (respeitando seus horários e compromissos) e criar os blocos da semana <strong>{semanaIso}</strong>. Você ajusta o que quiser depois.
          </p>
          <button
            type="button"
            onClick={gerarSemana}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar minha semana
          </button>
        </div>
      )}

      {/* navegação */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-center gap-2">
          {(step === 2 || step === 3) && (
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Pular por agora
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={proximo}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
