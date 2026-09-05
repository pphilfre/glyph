'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Link2, List, X } from 'lucide-react';
import type { Heading } from '@/lib/note-types';

export function ShareButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    const url = new URL(path, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url); setCopied(true); setFallback('');
      clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 2200);
    } catch { setFallback(url); }
  }
  return <div className="share-control"><button className="button small" onClick={copy}>{copied ? <Check size={15} /> : <Link2 size={15} />}<span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span></button>
    {fallback && <div className="share-fallback"><label>Copy this link<input readOnly value={fallback} onFocus={event => event.target.select()} autoFocus /></label><button className="icon-button" aria-label="Close share link" onClick={() => setFallback('')}><X size={16} /></button></div>}
  </div>;
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? '');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-80px 0px -60% 0px' });
    headings.forEach(heading => { const element = document.getElementById(heading.id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [headings]);
  if (!headings.length) return null;
  return <aside className="reader-toc">
    <button className="toc-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><List size={16} />On this page<span>{open ? '−' : '+'}</span></button>
    <nav aria-label="On this page" className={open ? 'is-open' : ''}><p>On this page</p>{headings.map(heading => <a key={heading.id} href={`#${heading.id}`} className={active === heading.id ? 'active' : ''} aria-current={active === heading.id ? 'location' : undefined} style={{ paddingLeft: `${12 + (heading.depth - 2) * 12}px` }} onClick={() => { setActive(heading.id); setOpen(false); }}>{heading.title}</a>)}</nav>
  </aside>;
}

export function CodeTools() {
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cleanups = Array.from(document.querySelectorAll<HTMLElement>('.document-body pre')).map(pre => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'code-copy'; button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code');
      const copy = async () => {
        try { await navigator.clipboard.writeText(code); button.textContent = 'Copied'; }
        catch { button.textContent = 'Select to copy'; const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(pre.querySelector('code') ?? pre); selection?.removeAllRanges(); selection?.addRange(range); }
        timers.push(setTimeout(() => { button.textContent = 'Copy'; }, 2000));
      };
      button.addEventListener('click', copy); pre.append(button);
      return () => { button.removeEventListener('click', copy); button.remove(); };
    });
    return () => { cleanups.forEach(cleanup => cleanup()); timers.forEach(clearTimeout); };
  }, []);
  return null;
}
