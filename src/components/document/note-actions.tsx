'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Check, Globe2, LoaderCircle, Trash2 } from 'lucide-react';
import type { NoteSummary } from '@/lib/note-types';
import { ShareButton } from './reader-tools';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function NoteActions({ note: initial }: { note: NoteSummary }) {
  const router = useRouter();
  const setPublished = useMutation(api.notes.setPublished);
  const remove = useMutation(api.notes.remove);
  const { isAuthenticated } = useConvexAuth();
  const [note, setNote] = useState(initial);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  async function act(action: 'publish' | 'unpublish' | 'delete') {
    if (busy || !isAuthenticated) return;
    setBusy(action); setError('');
    try {
      if (action === 'delete') { await remove({ id: note.id }); router.push('/dashboard'); router.refresh(); return; }
      const published = action === 'publish';
      await setPublished({ id: note.id, published });
      setNote({ ...note, published }); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'The request failed. Please try again.'); }
    finally { setBusy(''); }
  }
  return <section className="publish-bar" aria-label="Publishing controls">
    <div className="publish-status">{note.published ? <Check size={17} /> : <Globe2 size={17} />}<div><strong>{note.published ? 'Your note is published' : 'Looking good? Make it shareable.'}</strong><p>{note.published ? 'Anyone with the link can read this note.' : 'This preview is private. Only you can see it.'}</p></div></div>
    <div className="publish-actions">{note.published ? <><ShareButton path={`/p/${note.slug}`} /><Link className="button small" href={`/p/${note.slug}`}>Open page <ArrowUpRight size={15} /></Link><button disabled={!!busy || !isAuthenticated} className="text-button" onClick={() => void act('unpublish')}>{busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}</button></> : <button disabled={!!busy || !isAuthenticated} className="button primary" onClick={() => void act('publish')}>{busy === 'publish' ? <LoaderCircle size={16} className="spin" /> : <Globe2 size={16} />}{busy === 'publish' ? 'Publishing…' : 'Publish note'}</button>}
      <button disabled={!!busy || !isAuthenticated} className="icon-button" aria-label="Delete note" title="Delete note" onClick={() => setConfirm(!confirm)}><Trash2 size={16} /></button>
    </div>
    {note.published && <div className="published-url"><Link href={`/p/${note.slug}`}>/p/{note.slug}</Link></div>}
    {confirm && <div className="delete-confirm" role="alert"><span>Delete this note permanently? Its shared link will stop working.</span><button className="button danger small" disabled={!!busy || !isAuthenticated} onClick={() => void act('delete')}>{busy === 'delete' ? 'Deleting…' : 'Delete note'}</button><button className="button small" disabled={!!busy || !isAuthenticated} onClick={() => setConfirm(false)}>Keep note</button></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
