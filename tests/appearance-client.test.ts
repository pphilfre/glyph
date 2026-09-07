// @vitest-environment jsdom
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider, useAppearance } from '../src/components/theme-provider';
let root: Root;
let appearance: ReturnType<typeof useAppearance>;
function Probe() { const current = useAppearance(); useEffect(() => { appearance = current; }, [current]); return null; }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  root = createRoot(document.createElement('div'));
  for (const cookie of document.cookie.split(';')) document.cookie = cookie.split('=')[0] + '=; Max-Age=0; Path=/';
});
afterEach(async () => { await act(() => root.unmount()); vi.unstubAllGlobals(); });
async function mount(owner: string | null = null, migrate = false) {
  await act(() => root.render(createElement(ThemeProvider, { initial: 'canvas', owner, unavailable: false, migrate }, createElement(Probe))));
}
it('applies immediately and persists a signed-out preference without a network call', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await mount();
  await act(() => appearance.choose('midnight'));
  expect(document.documentElement.dataset.theme).toBe('midnight');
  expect(document.cookie).toContain('glyph-appearance-guest=midnight');
  expect(fetcher).not.toHaveBeenCalled();
});
it('serializes rapid selections and only confirms the latest save', async () => {
  const resolvers: ((value: { ok: boolean }) => void)[] = [];
  const fetcher = vi.fn(() => new Promise(resolve => resolvers.push(resolve))); vi.stubGlobal('fetch', fetcher);
  await mount('owner');
  await act(() => { appearance.choose('sage'); appearance.choose('frost'); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(document.documentElement.dataset.theme).toBe('frost');
  await act(async () => { resolvers[0]({ ok: true }); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(appearance.status).toContain('Saving');
  await act(async () => { resolvers[1]({ ok: true }); });
  expect(appearance.status).toContain('Saved to your account');
  expect(document.cookie).not.toContain('-pending=1');
});
it('keeps failed saves pending and allows retry', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher);
  await mount('owner');
  await act(() => appearance.choose('graphite'));
  expect(appearance.status).toContain('failed');
  expect(document.cookie).toContain('glyph-appearance-owner-pending=1');
  await act(() => appearance.retry());
  expect(appearance.status).toContain('Saved to your account');
  expect(document.cookie).not.toContain('-pending=1');
});
it('adopts a first-time account preference', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher);
  await mount('owner', true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(appearance.status).toContain('Saved to your account');
});
