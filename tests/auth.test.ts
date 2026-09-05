import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getToken: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import { requireConvexToken } from '../src/lib/auth';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'configured');
  vi.stubEnv('CLERK_SECRET_KEY', 'configured');
  mocks.auth.mockResolvedValue({ userId: 'user_owner', getToken: mocks.getToken });
});
afterEach(() => vi.unstubAllEnvs());

describe('Clerk Convex integration tokens', () => {
  it('uses the session token without requesting a named JWT template', async () => {
    mocks.getToken.mockImplementation(async (...args: unknown[]) => {
      if (args.length) throw new Error('JWT template not found');
      return 'session-token-with-convex-audience';
    });
    expect(await requireConvexToken()).toBe('session-token-with-convex-audience');
    expect(mocks.getToken).toHaveBeenCalledExactlyOnceWith();
  });

  it('redirects signed-out users before requesting a token', async () => {
    mocks.auth.mockResolvedValue({ userId: null, getToken: mocks.getToken });
    await expect(requireConvexToken()).rejects.toThrow('REDIRECT:/sign-in');
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it('rejects a missing session token instead of making an anonymous request', async () => {
    mocks.getToken.mockResolvedValue(null);
    await expect(requireConvexToken()).rejects.toThrow('Clerk could not authenticate with Convex');
  });

  it('propagates token issuance failures', async () => {
    mocks.getToken.mockRejectedValue(new Error('Session expired'));
    await expect(requireConvexToken()).rejects.toThrow('Session expired');
  });
});
