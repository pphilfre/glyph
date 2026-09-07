import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), query: vi.fn(), cookies: new Map<string, string>() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => mocks.cookies.has(name) ? { value: mocks.cookies.get(name) } : undefined }) }));
vi.mock('@/lib/auth', () => ({ userId: mocks.user, requireConvexToken: mocks.token }));
vi.mock('convex/nextjs', () => ({ fetchQuery: mocks.query }));
import { loadAppearance } from '../src/lib/appearance-server';
beforeEach(() => { vi.resetAllMocks(); mocks.cookies.clear(); mocks.user.mockResolvedValue('owner'); mocks.token.mockResolvedValue('token'); });
it('renders the account preference ahead of guest and stale browser choices', async () => {
  mocks.cookies.set('glyph-appearance-guest', 'sage'); mocks.cookies.set('glyph-appearance-owner', 'canvas'); mocks.query.mockResolvedValue('midnight');
  expect(await loadAppearance()).toMatchObject({ theme: 'midnight', migrate: false });
});
it('preserves pending local changes and retries them after a reload', async () => {
  mocks.cookies.set('glyph-appearance-owner', 'frost'); mocks.cookies.set('glyph-appearance-owner-pending', '1'); mocks.query.mockResolvedValue('canvas');
  expect(await loadAppearance()).toMatchObject({ theme: 'frost', migrate: false, syncPending: true });
});
it('uses a guest preference for a first-time account', async () => {
  mocks.cookies.set('glyph-appearance-guest', 'graphite'); mocks.query.mockResolvedValue(null);
  expect(await loadAppearance()).toMatchObject({ theme: 'graphite', migrate: true, syncPending: false });
});
it('falls back safely on storage outages and ignores invalid cookie values', async () => {
  mocks.cookies.set('glyph-appearance-owner', '<script>'); mocks.query.mockRejectedValue(new Error('offline'));
  expect(await loadAppearance()).toMatchObject({ theme: 'canvas', unavailable: true });
});
it('does not read another account preference while signed out', async () => {
  mocks.user.mockResolvedValue(null); mocks.cookies.set('glyph-appearance-owner', 'midnight');
  expect(await loadAppearance()).toMatchObject({ theme: 'canvas', owner: null });
  expect(mocks.query).not.toHaveBeenCalled();
});
