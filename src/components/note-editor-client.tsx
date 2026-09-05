'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlockNoteEditor, type PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { useAction, useConvexAuth } from 'convex/react';
import { ConvexError } from 'convex/values';
import { ArrowLeft, Eye, LoaderCircle, Save } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { markdownSource, MAX_NOTE_BYTES } from '@/lib/note-source';
import { exportEditorMarkdown, mapEditorText, protectMath } from '@/lib/editor-markdown';
import type { NoteEditorProps } from './note-editor';
import '@blocknote/mantine/style.css';

export default function NoteEditorClient({ note, source = '', blocks }: NoteEditorProps) {
  const router = useRouter();
  const saveDraft = useAction(api.notes.saveDraft);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [editor] = useState(() => {
    if (blocks) return BlockNoteEditor.create({ initialContent: JSON.parse(blocks) as PartialBlock[] });
    const instance = BlockNoteEditor.create();
    if (source) {
      const math = protectMath(markdownSource(source, note?.filename ?? 'note.md'));
      instance.replaceBlocks(instance.document, mapEditorText(instance.tryParseMarkdownToBlocks(math.text), math.restore));
    } else instance.replaceBlocks(instance.document, [{ type: 'heading', props: { level: 1 }, content: '' }, { type: 'paragraph', content: '' }]);
    return instance;
  });
  const identity = useRef({ id: note?.id, updatedAt: note?.updatedAt });
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState(note ? 'Private draft' : 'Not saved yet');
  const [error, setError] = useState('');
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
    const followLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (link && dirtyRef.current && !window.confirm('Leave without saving your changes?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', followLink, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', followLink, true); };
  }, []);

  async function save(preview: boolean) {
    if (saving.current || !isAuthenticated) return;
    if (identity.current.id && !dirty) { if (preview) router.push(`/notes/${identity.current.id}`); return; }
    saving.current = true; setBusy(preview ? 'preview' : 'save'); setError('');
    try {
      let hasText = false;
      mapEditorText(editor.document, text => { if (text.trim()) hasText = true; return text; });
      if (!hasText && !editor.document.some(block => block.type === 'codeBlock' && block.content.some(item => item.type === 'text' && item.text.trim()))) throw new Error('Write something before saving your note.');
      let markdown = exportEditorMarkdown(editor.document, blocks => editor.blocksToMarkdownLossy(blocks));
      // An untouched import keeps its exact source, including conversion notices.
      if (!dirty && source) markdown = markdownSource(source, note?.filename ?? 'note.md');
      const serialized = JSON.stringify(editor.document);
      if (!markdown.trim()) throw new Error('Write something before saving your note.');
      if (new Blob([markdown]).size > MAX_NOTE_BYTES || new Blob([serialized]).size > MAX_NOTE_BYTES) throw new Error('This note is too large. Shorten it before saving.');
      const result = await saveDraft({ id: identity.current.id, expectedUpdatedAt: identity.current.updatedAt, source: markdown, blocks: serialized });
      identity.current = result;
      dirtyRef.current = false; setDirty(false); setStatus('Saved privately');
      if (preview) router.push(`/notes/${result.id}`);
      else if (!note) router.replace(`/notes/${result.id}/edit`);
      router.refresh();
    } catch (error) { setError(error instanceof ConvexError ? String(error.data) : error instanceof Error ? error.message : 'Your draft could not be saved. Try again.'); }
    finally { saving.current = false; setBusy(''); }
  }

  return <>
    <header className="topbar editor-topbar"><Link className="back-link" href="/dashboard"><ArrowLeft size={16} />Your notes</Link><span className="subtle">Private draft</span></header>
    <main id="main-content" className="editor-workspace">
      <div className="editor-heading"><div><h1>{note ? 'Edit your note' : 'Create a note'}</h1><p>Start with a title. Type / to add headings, lists and more.</p></div><div className="editor-actions"><button className="button" disabled={!!busy || !isAuthenticated || (!!note && !dirty)} onClick={() => void save(false)}>{busy === 'save' ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}Save draft</button><button className="button primary" disabled={!!busy || !isAuthenticated} onClick={() => void save(true)}>{busy === 'preview' ? <LoaderCircle size={16} className="spin" /> : <Eye size={16} />}Save & preview</button></div></div>
      <div className="editor-save-status" role="status">{busy ? 'Saving your draft…' : dirty ? 'Unsaved changes' : status}<span>Choose your public URL after previewing.</span></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!isAuthenticated && <p className="editor-import-notice" role="status">{isLoading ? 'Connecting to your workspace…' : 'Your sign-in could not be verified. Copy any unsaved changes before reloading to reconnect.'}</p>}
      {source && !blocks && <p className="editor-import-notice">Your file is ready to edit. Check equations and formatting in the preview before publishing. Maths stays in $…$ or $$…$$ notation while you write.</p>}
      <div className="note-editor-surface"><BlockNoteView editor={editor} theme="light" editable={!busy} onChange={() => { dirtyRef.current = true; setDirty(true); }} /></div>
    </main>
  </>;
}
