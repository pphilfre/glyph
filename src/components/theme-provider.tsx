 'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { themeCookie, type ThemeId } from '@/lib/themes';
const Context = createContext<{ theme: ThemeId; choose: (theme: ThemeId) => void; status: string; retry: () => void }>({ theme: 'canvas', choose: () => {}, status: '', retry: () => {} });
export const useAppearance = () => useContext(Context);
export function ThemeProvider({ children, initial, owner, unavailable }: { children: React.ReactNode; initial: ThemeId; owner: string | null; unavailable: boolean }) {
  const [theme, setTheme] = useState(initial);
  const [status, setStatus] = useState(unavailable ? 'Account appearance unavailable. Using your browser preference.' : '');
  const queue = useRef(Promise.resolve());
  const latest = useRef(initial);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  function choose(next: ThemeId) {
    latest.current = next;
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${themeCookie(owner)}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setStatus(owner ? 'Saving to your account…' : 'Saved in this browser. Sign in to sync across devices.');
    if (owner) queue.current = queue.current.then(async () => {
      try {
        const response = await fetch('/api/appearance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }), keepalive: true });
        if (!response.ok) throw new Error();
        if (latest.current === next) setStatus('Saved to your account. Available on your other devices.');
      } catch { if (latest.current === next) setStatus('Saved in this browser. Account sync failed. Try again.'); }
    });
  }
  return <Context.Provider value={{ theme, choose, status, retry: () => choose(theme) }}>{children}</Context.Provider>;
}
