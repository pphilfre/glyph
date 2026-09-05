import { notFound, redirect } from 'next/navigation';
import { fetchAction } from 'convex/nextjs';
import { api } from '../../../../../convex/_generated/api';
import { requireConvexToken } from '@/lib/auth';
import { Shell } from '@/components/shell';
import { NoteEditor } from '@/components/note-editor';

export const metadata = { title: 'Edit note', robots: { index: false, follow: false } };
export default async function EditNote({ params }: PageProps<'/notes/[id]/edit'>) {
  const token = await requireConvexToken();
  const result = await fetchAction(api.notes.readOwned, { id: (await params).id }, { token });
  if (!result) notFound();
  if (result.note.published) redirect(`/notes/${result.note.id}`);
  return <Shell signedIn active="notes"><NoteEditor key={result.note.id} {...result} /></Shell>;
}
