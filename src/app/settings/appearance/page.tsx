import { Shell } from '@/components/shell';
import { Appearance } from '@/components/appearance';
import { userId } from '@/lib/auth';
export const metadata = { title: 'Appearance', robots: { index: false, follow: false } };
export default async function AppearancePage() {
  return <Shell signedIn={Boolean(await userId())} active="appearance"><Appearance /></Shell>;
}
