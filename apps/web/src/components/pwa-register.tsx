'use client';

import { useEffect } from 'react';

/** Registra o service worker (só em produção, pra não atrapalhar o dev). */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
