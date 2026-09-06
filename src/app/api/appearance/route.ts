import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '../../../../convex/_generated/api';
import { userId, requireConvexToken } from '@/lib/auth';
import { isTheme } from '@/lib/themes';
export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response('Invalid origin', { status: 403 });
  const owner = await userId();
  if (!owner) return new Response('Sign in required', { status: 401 });
  let value: unknown;
  try { value = (await request.json()).theme; } catch { return new Response('Invalid request', { status: 400 }); }
  if (!isTheme(value)) return new Response('Unknown appearance', { status: 400 });
  try {
    await fetchMutation(api.appearance.set, { theme: value }, { token: await requireConvexToken() });
    return NextResponse.json({ saved: true });
  } catch { return new Response('Appearance could not be synced', { status: 503 }); }
}
