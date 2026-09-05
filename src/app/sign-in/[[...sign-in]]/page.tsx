import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { isAuthConfigured } from '@/lib/auth';
import { Shell } from '@/components/shell';

export default function SignInPage() {
  return <Shell><header className="topbar"><Link className="wordmark" href="/">Glyph</Link></header><main id="main-content" className="auth-page">
    {isAuthConfigured() ? <SignIn /> : <div className="state-message"><h1>Sign-in is getting ready</h1><p>Account access is temporarily unavailable. You can still explore a published note.</p><Link href="/p/test" className="button primary">Read the example</Link></div>}
  </main></Shell>;
}
