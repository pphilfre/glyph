import { requireConvexToken } from '@/lib/auth';
import { Shell } from '@/components/shell';
import { NoteEditor } from '@/components/note-editor';

export const metadata = { title: 'Create a note', robots: { index: false, follow: false } };
export default async function NewNote() {
  await requireConvexToken();
  return <Shell signedIn active="notes"><NoteEditor /></Shell>;
}
