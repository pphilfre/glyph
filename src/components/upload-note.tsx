'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, LoaderCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
import { MAX_NOTE_BYTES, NOTE_EXTENSIONS } from '@/lib/note-source';
import { useAuth } from '@clerk/nextjs';
import { useConvexAuth } from 'convex/react';

export function UploadNote() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'saving' | 'ready'>('idle');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const busy = stage !== 'idle';

  async function upload(file: File) {
    if (inFlight.current) return;
    if (!isAuthenticated) { setError('Sign in to upload a note.'); return; }
    if (!NOTE_EXTENSIONS.test(file.name) || !file.size || file.size > MAX_NOTE_BYTES) {
      setError('Choose a non-empty .md, .markdown, .mtex, .mathtex or .tex file up to 2 MB.'); return;
    }
    inFlight.current = true;
    setError(''); setFilename(file.name); setStage('uploading');
    const fail = (message: string) => { setError(message); setStage('idle'); inFlight.current = false; };
    let token: string | null;
    try { token = await getToken({ template: 'convex' }); }
    catch { fail('Sign-in could not be verified. Please try again.'); return; }
    if (!token) { fail('Sign in to upload a note.'); return; }
    const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    if (!siteUrl) { fail('Uploads are not configured yet.'); return; }
    // Convex authenticates this bearer token before reading or storing the file.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${siteUrl}/notes/upload?filename=${encodeURIComponent(file.name)}`); xhr.timeout = 90_000;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
    xhr.upload.onload = () => setStage('saving');
    xhr.onerror = () => fail('The connection was interrupted. Check your connection and try again.');
    xhr.ontimeout = () => fail('Processing took too long. Check Your notes before trying again.');
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status === 401) { fail('Sign in again to upload your note.'); router.push('/sign-in'); return; }
        if (xhr.status !== 201 || !result.id) { fail(result.error || 'The upload failed. Please try again.'); return; }
        setStage('ready'); router.push(`/notes/${result.id}`); router.refresh();
      } catch { fail('The upload failed. Please try again.'); }
    };
    xhr.send(file);
  }

  return <div className="upload-area">
    <div className={`upload-drop ${dragging ? 'dragging' : ''} ${busy ? 'busy' : ''}`}
      onDragEnter={event => { event.preventDefault(); dragDepth.current++; if (!busy) setDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) setDragging(false); }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (event.dataTransfer.files.length !== 1) { setError('Upload one note at a time.'); return; } void upload(event.dataTransfer.files[0]); }} aria-busy={busy}>
      <span className="upload-symbol">{busy ? <LoaderCircle className="spin" size={26} /> : <FileUp size={26} strokeWidth={1.5} />}</span>
      <strong aria-live="polite">{stage === 'uploading' ? 'Uploading your note…' : stage === 'saving' ? 'Saving your note…' : stage === 'ready' ? 'Opening your preview…' : 'Drop your note here'}</strong>
      <span>{busy ? filename : 'Markdown, MathTeX or LaTeX (.tex), up to 2 MB'}</span>
      {busy ? <div className="processing-line"><span /></div> : <button disabled={!isAuthenticated} className="button primary" onClick={() => input.current?.click()}>{isLoading ? 'Connecting…' : 'Choose a file'} <ArrowUpRight size={16} /></button>}
      <small>{busy ? 'Your private preview will open next.' : 'LaTeX files are converted into notes. Review any conversion notices in your preview.'}</small>
      {!isLoading && !isAuthenticated && <p role="alert">Your sign-in could not be verified. Reload the page to reconnect.</p>}
      <input ref={input} type="file" tabIndex={-1} accept=".md,.markdown,.mtex,.mathtex,.tex" aria-label="Choose a Markdown, MathTeX or LaTeX note" className="visually-hidden" disabled={busy || !isAuthenticated} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} />
    </div>
    {error && <p className="inline-error" role="alert"><AlertCircle size={17} />{error}</p>}
  </div>;
}
