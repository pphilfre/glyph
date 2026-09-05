'use client';
import Link from 'next/link';
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="main-content" className="error-page"><h1>This page couldn’t be loaded</h1><p>Please try again in a moment.</p><div className="error-actions"><button className="button primary" onClick={retry}>Try again</button><Link className="button" href="/">Go to Glyph</Link></div></main>;
}
