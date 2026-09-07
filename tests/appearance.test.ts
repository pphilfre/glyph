import { describe, expect, it } from 'vitest';
import { backend } from './convex-helpers';
import { api } from '../convex/_generated/api';
import { themeIds, isTheme, themeCookie } from '../src/lib/themes';
describe('account appearance', () => {
  it('requires authentication for reads and writes', async () => {
    const t = backend();
    await expect(t.query(api.appearance.get, {})).rejects.toThrow('Sign in');
    await expect(t.mutation(api.appearance.set, { theme: 'sage' })).rejects.toThrow('Sign in');
  });
  it('persists all appearances across sessions and isolates accounts', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    const other = t.withIdentity({ subject: 'other' });
    for (const theme of themeIds) {
      await owner.mutation(api.appearance.set, { theme });
      expect(await t.withIdentity({ subject: 'owner' }).query(api.appearance.get, {})).toBe(theme);
      expect(await other.query(api.appearance.get, {})).toBeNull();
    }
    expect(await t.run(ctx => ctx.db.query('preferences').collect())).toHaveLength(1);
  });
  it('rejects unknown preferences and separates browser fallback keys', async () => {
    const t = backend().withIdentity({ subject: 'owner' });
    await expect(t.mutation(api.appearance.set, { theme: 'invalid' })).rejects.toThrow('Unknown');
    expect(isTheme('<script>')).toBe(false);
    expect(themeCookie('owner')).not.toBe(themeCookie('other'));
    expect(themeCookie(null)).not.toBe(themeCookie('owner'));
  });
});
