import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { RenderedNote } from '@/lib/note-types';
import { CodeTools, ShareButton, TableOfContents } from './reader-tools';

export function Reader({ document, slug, preview = false, example = false, actions }: { document: RenderedNote; slug?: string; preview?: boolean; example?: boolean; actions?: React.ReactNode }) {
  return <>
    <header className="topbar reader-topbar">{preview ? <Link href="/dashboard" className="back-link"><ArrowLeft size={16} />Your notes</Link> : <Link href="/" className="wordmark">Glyph</Link>}<div className="topbar-actions">{example && <span className="subtle example-label">Example note</span>}{preview ? <span className="subtle">Preview</span> : slug && <ShareButton path={`/p/${slug}`} />}</div></header>
    {actions}
    <main id="main-content" className="reader-layout">
      <TableOfContents headings={document.headings} />
      <article className="document">
        <header className="document-header"><div className="document-meta">{example && <span>Classical mechanics</span>}<span>{document.readMinutes} min read</span></div><h1>{document.title}</h1></header>
        <div className="document-body" dangerouslySetInnerHTML={{ __html: document.html }} />
        <CodeTools />
        <footer className="document-footer"><span>{preview ? 'Preview on ' : 'Published with '}<Link href="/">Glyph</Link></span><a href="#main-content">Back to top ↑</a></footer>
      </article>
    </main>
  </>;
}
