import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export function isAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
export async function userId() {
  if (!isAuthConfigured()) return null;
  return (await auth()).userId;
}
export async function requireUser() {
  const id = await userId();
  if (!id) redirect('/sign-in');
  return id;
}

export async function requireConvexToken() {
  await requireUser();
  const token = await (await auth()).getToken({ template: 'convex' });
  if (!token) throw new Error('Clerk could not authenticate with Convex. Check the Clerk Convex integration.');
  return token;
}
