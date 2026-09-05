import { requireUser, requireConvexToken } from '@/lib/auth';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { NoteSummary } from '@/lib/note-types';
import { Shell } from '@/components/shell';
import { NotesDashboard } from '@/components/notes-dashboard';
export const metadata = { title: 'Your notes', robots: { index: false, follow: false } };
export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  await requireUser();
  let notes: NoteSummary[] = [];
  let error = false;
  try { notes = await fetchQuery(api.notes.list, {}, { token: await requireConvexToken() }); } catch { error = true; }
  return <Shell signedIn active="notes"><NotesDashboard notes={notes} loadError={error} showUpload={(await searchParams).upload === '1'} /></Shell>;
}
