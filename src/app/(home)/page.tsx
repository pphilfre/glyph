import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { userId } from '@/lib/auth';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: { absolute: 'Glyph — Your notes, ready for the web' },
  description: 'Write or import Markdown and LaTeX, refine a private draft, and publish a beautiful web page at your own link. Give your technical notes a home with Glyph.',
};

export default async function HomePage() {
  if (await userId()) redirect('/dashboard');
  return <LandingPage />;
}
