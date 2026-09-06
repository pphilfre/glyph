import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { isTheme } from '../src/lib/themes';
export const get = query({ args: {}, handler: async ctx => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Sign in to load appearance.');
  return (await ctx.db.query('preferences').withIndex('by_owner', q => q.eq('ownerId', identity.subject)).unique())?.theme ?? null;
} });
export const set = mutation({ args: { theme: v.string() }, handler: async (ctx, { theme }) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Sign in to save appearance.');
  if (!isTheme(theme)) throw new ConvexError('Unknown appearance.');
  const existing = await ctx.db.query('preferences').withIndex('by_owner', q => q.eq('ownerId', identity.subject)).unique();
  if (existing) await ctx.db.patch('preferences', existing._id, { theme });
  else await ctx.db.insert('preferences', { ownerId: identity.subject, theme });
} });
