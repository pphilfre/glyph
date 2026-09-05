import { notFound } from 'next/navigation';
import { requireConvexToken } from '@/lib/auth';
import { fetchAction } from 'convex/nextjs';
import { api } from '../../../../convex/_generated/api';
import { renderNote } from '@/lib/rendering';
import { Shell } from '@/components/shell';
import { Reader } from '@/components/document/reader';
import { NoteActions } from '@/components/document/note-actions';
export const metadata = { title: 'Note preview', robots: { index: false, follow: false } };
export default async function NotePreview({ params }: PageProps<'/notes/[id]'>) {
  const token = await requireConvexToken();
  const result = await fetchAction(api.notes.readOwned, { id: (await params).id }, { token });
  if (!result) notFound();
  return <Shell signedIn active="notes"><Reader document={await renderNote(result.source, result.note.filename)} preview actions={<NoteActions key={result.note.id} note={result.note} />} /></Shell>;
}
