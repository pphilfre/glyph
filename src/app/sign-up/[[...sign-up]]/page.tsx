import { SignUp } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { isAuthConfigured } from '@/lib/auth';
import { Shell } from '@/components/shell';
export default function SignUpPage() {
  if (!isAuthConfigured()) redirect('/sign-in');
  return <Shell><main id="main-content" className="auth-page"><SignUp /></main></Shell>;
}
