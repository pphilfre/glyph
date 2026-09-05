import { cache } from 'react';
import { validSlug } from '@/lib/publish-url';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import { Reader } from '@/components/document/reader';
import { exampleNote } from '@/lib/example-note';
import { fetchAction } from 'convex/nextjs';
import { api } from '../../../../convex/_generated/api';
import { renderNote } from '@/lib/rendering';

export const dynamic = 'force-dynamic';
const publishedDocument = cache(async (slug: string) => {
  if (slug === 'test') return exampleNote();
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !validSlug(slug)) notFound();
  const note = await fetchAction(api.notes.readPublished, { slug });
  if (!note) notFound();
  return renderNote(note.source, note.filename);
});
export default async function PublishedPage({ params }: PageProps<'/p/[slug]'>) {
  const { slug } = await params;
  const document = await publishedDocument(slug);
  return <Shell active="read"><Reader document={document} slug={slug} example={slug === 'test'} /></Shell>;
}
export async function generateMetadata({ params }: PageProps<'/p/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const document = await publishedDocument(slug);
  return { title: document.title, description: 'Read this note on Glyph.', robots: { index: false, follow: false }, openGraph: { title: document.title, description: 'A note shared with Glyph.', type: 'article' } };
}
