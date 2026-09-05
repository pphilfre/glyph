'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, FileText, Plus, Search, X } from 'lucide-react';
import type { NoteSummary } from '@/lib/note-types';
import { UploadNote } from './upload-note';

export function NotesDashboard({ notes, loadError, showUpload }: { notes: NoteSummary[]; loadError: boolean; showUpload: boolean }) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState('');
  const upload = uploadOpen || showUpload || (!loadError && notes.length === 0);
  const filtered = notes.filter(note => `${note.title} ${note.filename}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <header className="topbar"><Link href="/dashboard" className="wordmark">Glyph</Link><span className="subtle">Your workspace</span></header>
    <main id="main-content" className="workspace">
      <div className="workspace-heading"><div><h1>Your notes</h1><p>{notes.length ? 'A little knowledge, ready to go further.' : 'Your next idea deserves a good home.'}</p></div>
        <div className="workspace-actions"><Link href="/notes/new" className="button primary"><Plus size={16} />Create note</Link>{(notes.length > 0 || loadError) && <button className="button" onClick={() => { setUploadOpen(!upload); if (showUpload) router.replace('/dashboard'); }}>{upload ? <X size={16} /> : <Plus size={16} />}{upload ? 'Close upload' : 'Upload note'}</button>}</div>
      </div>
      {upload && <UploadNote />}
      {loadError ? <div className="state-message" role="alert"><h2>Your notes couldn’t be loaded</h2><p>They’re still yours. Try again in a moment.</p><button className="button" onClick={() => router.refresh()}>Try again</button></div> : <>
        {notes.length > 0 ? <section className="notes-list" aria-label="Your notes">
          <div className="list-toolbar"><span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span><label className="search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a note" aria-label="Find a note" /></label></div>
          {filtered.map(note => <Link className="note-row" href={`/notes/${note.id}`} key={note.id}><FileText size={21} strokeWidth={1.4} /><div className="note-row-title"><strong>{note.title}</strong><span>{note.filename}</span></div><span className={`note-status ${note.published ? 'published' : ''}`}>{note.published ? 'Published' : 'Private'}</span><time dateTime={new Date(note.createdAt).toISOString()}>{new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</time><ArrowUpRight size={16} /></Link>)}
          {!filtered.length && <div className="state-message"><p>No notes match “{query}”.</p><button className="button" onClick={() => setQuery('')}>Clear search</button></div>}
        </section> : <Link href="/p/test" className="example-link">Take a look at an example <ArrowUpRight size={15} /></Link>}
      </>}
    </main>
  </>;
}
