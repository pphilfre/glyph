import Link from 'next/link';
export default function NotFound() {
  return <main id="main-content" className="error-page"><span className="wordmark">Glyph</span><h1>This note isn’t available</h1><p>The link may be incorrect, or its owner may have unpublished it.</p><Link href="/" className="button">Go to Glyph</Link></main>;
}
