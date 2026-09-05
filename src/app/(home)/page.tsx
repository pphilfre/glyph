import Link from 'next/link';
import { ArrowUpRight, FileUp, Check, Link2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { userId } from '@/lib/auth';
import { Shell } from '@/components/shell';

export default async function HomePage() {
  if (await userId()) redirect('/dashboard');
  return <Shell active="upload">
    <header className="topbar"><Link href="/" className="wordmark">Glyph</Link><Link href="/sign-in" className="button small">Sign in</Link></header>
    <main id="main-content" className="welcome">
      <div className="welcome-copy"><h1>Your notes.<br />Ready for the web.</h1><p>Give your technical notes a little breathing room.<br className="desktop-break" /> Upload a file. Publish a page. Share an idea.</p></div>
      <Link href="/sign-in" className="upload-invitation">
        <span className="upload-symbol"><FileUp size={26} strokeWidth={1.5} /></span>
        <strong>Bring your notes to Glyph</strong>
        <span>Markdown with maths, up to 2 MB</span>
        <span className="button primary">Sign in to upload <ArrowUpRight size={16} /></span>
        <small>Your notes stay private until you publish.</small>
      </Link>
      <div className="journey" aria-label="How it works"><span><FileUp size={15} /> Upload your file</span><span><Check size={15} /> Preview & publish</span><span><Link2 size={15} /> Share the link</span></div>
      <Link href="/p/test" className="example-link"><span>See what a published note looks like</span><ArrowUpRight size={15} /></Link>
    </main>
    <footer className="quiet-footer">Thoughtfully written. Beautifully shared.</footer>
  </Shell>;
}
