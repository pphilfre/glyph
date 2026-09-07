import 'server-only';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';
import { userId, requireConvexToken } from './auth';
import { isTheme, themeCookie, type ThemeId } from './themes';
export async function loadAppearance() {
  const owner = await userId();
  const jar = await cookies();
  const cached = jar.get(themeCookie(owner))?.value;
  const guest = jar.get(themeCookie(null))?.value;
  let theme: ThemeId = isTheme(cached) ? cached : isTheme(guest) ? guest : 'canvas';
  let unavailable = false;
  let migrate = false;
  let syncPending = false;
  const pendingAccountTheme = jar.get(`${themeCookie(owner)}-pending`)?.value === '1' && isTheme(cached);
  if (owner) {
    try {
      const saved = await fetchQuery(api.appearance.get, {}, { token: await requireConvexToken() });
      if (pendingAccountTheme) syncPending = true;
      else if (isTheme(saved)) theme = saved;
      else if (saved === null && !isTheme(cached) && isTheme(guest)) migrate = true;
    } catch { unavailable = true; }
  }
  return { owner, theme, unavailable, migrate, syncPending };
}
