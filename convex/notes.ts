import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { MAX_NOTE_BYTES, sourceTitle, validateSource } from '../src/lib/note-source';
import { validSlug } from '../src/lib/publish-url';

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
  args: { id: v.id('notes'), published: v.boolean(), slug: v.optional(v.string()) },
  handler: async (ctx, { id, published, slug }) => {
    const note = await owned(ctx, id);
    if (!note) throw new ConvexError('Note not found.');
    const nextSlug = slug ?? note.slug;
    if (!validSlug(nextSlug)) throw new ConvexError('Use 3–64 lowercase letters, numbers and single hyphens. The URL “test” is reserved.');
    const existing = await ctx.db.query('notes').withIndex('by_slug', q => q.eq('slug', nextSlug)).unique();
    if (existing && existing._id !== id) throw new ConvexError('This URL is already taken. Choose another.');
    await ctx.db.patch('notes', id, { published, slug: nextSlug, updatedAt: Math.max(Date.now(), note.updatedAt + 1) });
  },
});

export const remove = mutation({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    const note = await owned(ctx, id);
    if (!note) throw new ConvexError('Note not found.');
    await ctx.storage.delete(note.sourceStorageId);
    if (note.editorStorageId) await ctx.storage.delete(note.editorStorageId);
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
  handler: async (ctx, { id }): Promise<{ note: ReturnType<typeof summary>; source: string; blocks?: string } | null> => {
    const note = await ctx.runQuery(internal.notes.ownedSource, { id });
    if (!note) return null;
    const file = await ctx.storage.get(note.sourceStorageId);
    if (!file) throw new ConvexError('Note file is unavailable.');
    const editorFile = note.editorStorageId ? await ctx.storage.get(note.editorStorageId) : null;
    return { note: summary(note), source: await file.text(), ...(editorFile ? { blocks: await editorFile.text() } : {}) };
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

// Recheck ownership, publication and revision atomically after the action stores files.
export const commitDraft = internalMutation({
  args: { id: v.optional(v.id('notes')), expectedUpdatedAt: v.optional(v.number()), sourceStorageId: v.id('_storage'), editorStorageId: v.id('_storage'), title: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const now = Date.now();
    if (args.id) {
      const note = await owned(ctx, args.id);
      if (!note) throw new ConvexError('Note not found.');
      if (note.published) throw new ConvexError('Unpublish this note before editing it.');
      if (note.updatedAt !== args.expectedUpdatedAt) throw new ConvexError('This note changed in another tab. Copy your changes before reloading.');
      const updatedAt = Math.max(now, note.updatedAt + 1);
      await ctx.db.patch('notes', args.id, { sourceStorageId: args.sourceStorageId, editorStorageId: args.editorStorageId, title: args.title, filename: note.filename.replace(/\.(mtex|mathtex)$/i, '.md'), updatedAt });
      await ctx.storage.delete(note.sourceStorageId);
      if (note.editorStorageId) await ctx.storage.delete(note.editorStorageId);
      return { id: args.id, updatedAt };
    }
    const id = await ctx.db.insert('notes', { ownerId, title: args.title, filename: 'note.md', sourceStorageId: args.sourceStorageId, editorStorageId: args.editorStorageId, slug: '', published: false, createdAt: now, updatedAt: now });
    await ctx.db.patch('notes', id, { slug: id });
    return { id, updatedAt: now };
  },
});

export const saveDraft = action({
  args: { id: v.optional(v.id('notes')), expectedUpdatedAt: v.optional(v.number()), source: v.string(), blocks: v.string() },
  handler: async (ctx, { id, expectedUpdatedAt, source, blocks }): Promise<{ id: Doc<'notes'>['_id']; updatedAt: number }> => {
    await requireOwner(ctx);
    let filename = 'Untitled note.md';
    if (id) {
      const note = await ctx.runQuery(internal.notes.ownedSource, { id });
      if (!note) throw new ConvexError('Note not found.');
      if (note.published) throw new ConvexError('Unpublish this note before editing it.');
      filename = note.filename;
    }
    validateSource(source);
    const sourceBlob = new Blob([source], { type: 'text/plain;charset=utf-8' });
    const editorBlob = new Blob([blocks], { type: 'application/json' });
    if (sourceBlob.size > MAX_NOTE_BYTES || editorBlob.size > MAX_NOTE_BYTES) throw new ConvexError('This note is too large. Keep the text and editor data under 2 MB each.');
    let parsed: unknown;
    try { parsed = JSON.parse(blocks); } catch { throw new ConvexError('Invalid editor content.'); }
    if (!Array.isArray(parsed) || !parsed.length || parsed.some(block => !block || typeof block.type !== 'string')) throw new ConvexError('Invalid editor content.');
    const sourceStorageId = await ctx.storage.store(sourceBlob);
    let editorStorageId;
    try {
      editorStorageId = await ctx.storage.store(editorBlob);
      return await ctx.runMutation(internal.notes.commitDraft, { id, expectedUpdatedAt, sourceStorageId, editorStorageId, title: sourceTitle(source, filename) });
    } catch (error) {
      await ctx.storage.delete(sourceStorageId);
      if (editorStorageId) await ctx.storage.delete(editorStorageId);
      throw error;
    }
  },
});
