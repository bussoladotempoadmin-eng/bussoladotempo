'use client';

import * as React from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

type Estado = 'carregando' | 'sem-suporte' | 'bloqueado' | 'ativo' | 'inativo' | 'ocupado';

export function AtivarLembretes() {
  const [estado, setEstado] = React.useState<Estado>('carregando');
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    let vivo = true;
    (async () => {
      const suportado =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        Boolean(VAPID_PUBLIC);
      if (!suportado) {
        if (vivo) setEstado('sem-suporte');
        return;
      }
      if (Notification.permission === 'denied') {
        if (vivo) setEstado('bloqueado');
        return;
      }
      try {
        const reg = await getRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (vivo) setEstado(sub ? 'ativo' : 'inativo');
      } catch {
        if (vivo) setEstado('inativo');
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function ativar() {
    setErro(null);
    setEstado('ocupado');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setEstado(perm === 'denied' ? 'bloqueado' : 'inativo');
        return;
      }
      const reg = await getRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const json = sub.toJSON();
      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!r.ok) throw new Error('falha ao salvar');
      setEstado('ativo');
    } catch {
      setErro('Não consegui ativar agora. Tenta de novo.');
      setEstado('inativo');
    }
  }

  async function desativar() {
    setErro(null);
    setEstado('ocupado');
    try {
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEstado('inativo');
    } catch {
      setErro('Não consegui desativar agora.');
      setEstado('ativo');
    }
  }

  if (estado === 'carregando' || estado === 'sem-suporte') return null;

  if (estado === 'bloqueado') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          As notificações estão bloqueadas no navegador. Pra receber o lembrete do ritual, libere
          as notificações da Bússola nas configurações do site.
        </p>
      </div>
    );
  }

  if (estado === 'ativo') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <Bell className="h-4 w-4" />
          Lembretes do ritual ativados
        </p>
        <button
          type="button"
          onClick={desativar}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Desativar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Bell className="h-4 w-4 text-primary" />
            Ativar lembrete do ritual
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Um toque no domingo pra revisar a semana e planejar a próxima — mesmo com o app fechado.
          </p>
        </div>
        <button
          type="button"
          onClick={ativar}
          disabled={estado === 'ocupado'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {estado === 'ocupado' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
          Ativar
        </button>
      </div>
      {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
    </div>
  );
}
