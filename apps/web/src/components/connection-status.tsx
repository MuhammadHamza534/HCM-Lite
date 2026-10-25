import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type ConnectionState = 'loading' | 'online' | 'database-unavailable' | 'offline';

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('loading');

  useEffect(() => {
    let active = true;
    async function checkConnection() {
      try {
        await api.health();
        try {
          await api.readiness();
          if (active) setState('online');
        } catch {
          if (active) setState('database-unavailable');
        }
      } catch {
        if (active) setState('offline');
      }
    }
    void checkConnection();
    return () => { active = false; };
  }, []);

  const text = {
    loading: 'Checking live API connection…',
    online: 'API and database are available',
    'database-unavailable': 'API is live; database is not ready',
    offline: 'API is unavailable'
  }[state];
  const color = state === 'online' ? 'bg-emerald-100 text-emerald-800' : state === 'loading' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900';
  return <p aria-live="polite" className={`max-w-full break-words rounded-full px-3 py-1 text-center text-sm font-medium ${color}`}>{text}</p>;
}
