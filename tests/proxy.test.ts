import { describe, expect, it, vi } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

vi.mock('@clerk/nextjs/server', () => ({ clerkMiddleware: () => vi.fn() }));
import { config } from '../src/proxy';

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });

describe('Clerk proxy routing', () => {
  it.each([
    '/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js',
    '/__clerk/npm/@clerk/ui@1/dist/ui.browser.js',
    '/__clerk/v1/client',
    '/__clerk/v1/environment',
  ])('passes %s to Clerk middleware', url => {
    expect(matches(url)).toBe(true);
  });

  it.each(['/_next/static/chunks/app.js', '/icon.svg', '/styles.css'])('still skips ordinary static assets: %s', url => {
    expect(matches(url)).toBe(false);
  });
});
