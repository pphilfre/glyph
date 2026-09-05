import Link from 'next/link';
import { BookOpen, Files, Plus, LogIn } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

export function Shell({ children, active, signedIn = false }: { children: React.ReactNode; active?: 'upload' | 'notes' | 'read'; signedIn?: boolean }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="rail" aria-label="Main navigation">
      <Link href="/" className="rail-logo" aria-label="Glyph home" title="Glyph home">g<span>.</span></Link>
      <nav>
        <Link href={signedIn ? '/dashboard?upload=1' : '/sign-in'} className={`rail-link ${active === 'upload' ? 'active' : ''}`} aria-label="Upload a note" title="Upload a note"><Plus size={21} /></Link>
        <Link href="/dashboard" className={`rail-link ${active === 'notes' ? 'active' : ''}`} aria-label="Your notes" title="Your notes"><Files size={20} /></Link>
        <Link href={active === 'read' ? '#main-content' : '/p/test'} className={`rail-link ${active === 'read' ? 'active' : ''}`} aria-label={active === 'read' ? 'Current note' : 'Read an example'} title={active === 'read' ? 'Current note' : 'Read an example'}><BookOpen size={19} /></Link>
      </nav>
      <div className="rail-bottom">{signedIn ? <UserButton /> : <Link href="/sign-in" className="rail-link" aria-label="Sign in" title="Sign in"><LogIn size={19} /></Link>}</div>
    </aside>
    <div className="app-body">{children}</div>
  </div>;
}
