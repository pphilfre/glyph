 'use client';
import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { themeCookie, type ThemeId } from '@/lib/themes';
const Context = createContext<{ theme: ThemeId; choose: (theme: ThemeId) => void; status: string; retry: () => void }>({ theme: 'canvas', choose: () => {}, status: '', retry: () => {} });
export const useAppearance = () => useContext(Context);
export function ThemeProvider({ children, initial, owner, unavailable, migrate, syncPending }: { children?: React.ReactNode; initial: ThemeId; owner: string | null; unavailable: boolean; migrate: boolean; syncPending: boolean }) {
  const [theme, setTheme] = useState(initial);
  const [status, setStatus] = useState(unavailable ? 'Account appearance unavailable. Using your browser preference.' : '');
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `${themeCookie(owner)}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  }, [theme, owner]);
  const persist = useCallback((next: ThemeId) => {
    if (!owner) return;
    const currentRevision = ++revision.current;
    document.cookie = `${themeCookie(owner)}-pending=1; Path=/; Max-Age=31536000; SameSite=Lax`;
    setStatus('Saving to your account…');
    queue.current = queue.current.then(async () => {
      try {
        const response = await fetch('/api/appearance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }), keepalive: true });
        if (!response.ok) throw new Error();
        if (revision.current === currentRevision) {
          document.cookie = `${themeCookie(owner)}-pending=; Path=/; Max-Age=0; SameSite=Lax`;
          setStatus('Saved to your account. Available on your other devices.');
        }
      } catch { if (revision.current === currentRevision) setStatus('Saved in this browser. Account sync failed. Try again.'); }
    });
  }, [owner]);
  const choose = useCallback((next: ThemeId) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${themeCookie(owner)}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    if (owner) persist(next);
    else setStatus('Saved in this browser. Sign in to sync across devices.');
  }, [owner, persist]);
  const migrated = useRef(false);
  useEffect(() => { if (migrate && owner && !migrated.current) { migrated.current = true; choose(initial); } }, [migrate, owner, initial, choose]);
  const synchronized = useRef(false);
  useEffect(() => { if (syncPending && owner && !synchronized.current) { synchronized.current = true; persist(initial); } }, [syncPending, owner, initial, persist]);
  return <Context.Provider value={{ theme, choose, status, retry: () => choose(theme) }}>{children}</Context.Provider>;
}
