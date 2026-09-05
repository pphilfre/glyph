import { ClerkProvider } from '@clerk/nextjs';
import { IBM_Plex_Mono, Instrument_Sans } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { isAuthConfigured } from '@/lib/auth';
import { ConvexProvider } from '@/components/convex-provider';
import 'katex/dist/katex.min.css';
import './global.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
export const metadata: Metadata = {
  title: { default: 'Glyph — A home for your notes', template: '%s · Glyph' },
  description: 'Turn Markdown and mathematical notes into beautiful, shareable web pages.',
};
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#ffffff' };
// Private and published pages resolve authentication and visibility at request time.
export const dynamic = 'force-dynamic';
export default function Layout({ children }: LayoutProps<'/'>) {
  return <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable}`}><body>
    {isAuthConfigured() ? <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard"><ConvexProvider>{children}</ConvexProvider></ClerkProvider> : children}
  </body></html>;
}
