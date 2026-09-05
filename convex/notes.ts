import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';

async function requireOwner(ctx: Pick<QueryCtx, 'auth'>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Sign in to manage your notes.');
  return identity.subject;
}

async function owned(ctx: QueryCtx, id: string) {
  const ownerId = await requireOwner(ctx);
  const noteId = ctx.db.normalizeId('notes', id);
  const note = noteId ? await ctx.db.get('notes', noteId) : null;
  return note?.ownerId === ownerId ? note : null;
}

async function published(ctx: QueryCtx, slug: string) {
  const note = await ctx.db.query('notes').withIndex('by_slug', q => q.eq('slug', slug)).unique();
  return note?.published === true ? note : null;
}

// Neither owner IDs nor durable file URLs are exposed in summaries.
function summary(note: Doc<'notes'>) {
  return { id: note._id, title: note.title, slug: note.slug, filename: note.filename,
    published: note.published, createdAt: note.createdAt, updatedAt: note.updatedAt };
}

export const list = query({
  args: {},
  handler: async ctx => {
    const ownerId = await requireOwner(ctx);
    const notes = await ctx.db.query('notes').withIndex('by_owner', q => q.eq('ownerId', ownerId)).order('desc').collect();
    return notes.map(summary);
  },
});

export const getOwned = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const note = await owned(ctx, id);
    return note ? summary(note) : null;
  },
});

export const getPublished = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const note = await published(ctx, slug);
    return note ? { title: note.title, slug: note.slug, updatedAt: note.updatedAt } : null;
  },
});

// Only the authenticated upload action can call this, after storing its file.
// Clerk identity propagates through runMutation; no caller supplies an owner ID.
export const create = internalMutation({
  args: { sourceStorageId: v.id('_storage'), title: v.string(), filename: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const now = Date.now();
    const id = await ctx.db.insert('notes', { ...args, ownerId, slug: '', published: false, createdAt: now, updatedAt: now });
    // Convex IDs are unique; URLs stay stable across publish cycles.
    await ctx.db.patch('notes', id, { slug: id });
    return id;
  },
});

export const setPublished = mutation({
  args: { id: v.id('notes'), published: v.boolean() },
  handler: async (ctx, { id, published }) => {
    if (!await owned(ctx, id)) throw new ConvexError('Note not found.');
    await ctx.db.patch('notes', id, { published, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    const note = await owned(ctx, id);
    if (!note) throw new ConvexError('Note not found.');
    await ctx.storage.delete(note.sourceStorageId);
    await ctx.db.delete('notes', id);
  },
});

export const ownedSource = internalQuery({
  args: { id: v.string() },
  handler: (ctx, { id }) => owned(ctx, id),
});

export const publishedSource = internalQuery({
  args: { slug: v.string() },
  handler: (ctx, { slug }) => published(ctx, slug),
});

export const readOwned = action({
  args: { id: v.string() },
  handler: async (ctx, { id }): Promise<{ note: ReturnType<typeof summary>; source: string } | null> => {
    const note = await ctx.runQuery(internal.notes.ownedSource, { id });
    if (!note) return null;
    const file = await ctx.storage.get(note.sourceStorageId);
    if (!file) throw new ConvexError('Note file is unavailable.');
    return { note: summary(note), source: await file.text() };
  },
});

export const readPublished = action({
  args: { slug: v.string() },
  handler: async (ctx, { slug }): Promise<{ title: string; filename: string; source: string } | null> => {
    const note = await ctx.runQuery(internal.notes.publishedSource, { slug });
    if (!note) return null;
    const file = await ctx.storage.get(note.sourceStorageId);
    if (!file) throw new ConvexError('Note file is unavailable.');
    return { title: note.title, filename: note.filename, source: await file.text() };
  },
});
