import { describe, expect, it } from 'vitest';
import { api, internal } from '../convex/_generated/api';
import { backend, uploadNote } from './convex-helpers';

describe('Clerk ownership in Convex', () => {
  it('rejects every private operation without authentication', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'user_owner' });
    const id = await uploadNote(owner);
    const stored = await t.run(ctx => ctx.db.get('notes', id));
    await expect(t.query(api.notes.list, {})).rejects.toThrow('Sign in');
    await expect(t.query(api.notes.getOwned, { id })).rejects.toThrow('Sign in');
    await expect(t.action(api.notes.readOwned, { id })).rejects.toThrow('Sign in');
    await expect(t.mutation(api.notes.setPublished, { id, published: true })).rejects.toThrow('Sign in');
    await expect(t.mutation(api.notes.setPublished, { id, published: false })).rejects.toThrow('Sign in');
    await expect(t.mutation(api.notes.remove, { id })).rejects.toThrow('Sign in');
    await expect(t.mutation(internal.notes.create, { sourceStorageId: stored!.sourceStorageId, filename: 'stolen.md', title: 'stolen' })).rejects.toThrow('Sign in');
  });

  it('derives owners from the verified identity and isolates lists, previews and writes', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'user_owner' });
    const other = t.withIdentity({ subject: 'user_other' });
    const id = await uploadNote(owner);
    const otherId = await uploadNote(other, '# Other');
    expect((await owner.query(api.notes.list, {})).map(note => note.id)).toEqual([id]);
    expect((await other.query(api.notes.list, {})).map(note => note.id)).toEqual([otherId]);
    expect((await t.run(ctx => ctx.db.get('notes', id)))?.ownerId).toBe('user_owner');
    expect(await other.query(api.notes.getOwned, { id })).toBeNull();
    expect(await other.action(api.notes.readOwned, { id })).toBeNull();
    for (const published of [true, false]) {
      await expect(other.mutation(api.notes.setPublished, { id, published })).rejects.toThrow('Note not found');
    }
    await expect(other.mutation(api.notes.remove, { id })).rejects.toThrow('Note not found');
    expect((await owner.action(api.notes.readOwned, { id }))?.source).toContain('# Mechanics');
    expect(await owner.query(api.notes.getOwned, { id: 'invalid-id' })).toBeNull();
  });

  it('ignores forged owner and storage query parameters during upload', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'real_owner' });
    const response = await owner.fetch('/notes/upload?filename=note.md&ownerId=victim&sourceStorageId=stolen', { method: 'POST', body: '# Real source' });
    expect(response.status).toBe(201);
    const { id } = await response.json();
    expect((await t.run(ctx => ctx.db.get('notes', id)))?.ownerId).toBe('real_owner');
    expect((await owner.action(api.notes.readOwned, { id }))?.source).toBe('# Real source');
  });
});

describe('publication and file lifecycle', () => {
  it('only exposes published notes, revokes reads on unpublish, and keeps unique stable links', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    const id = await uploadNote(owner);
    const second = await uploadNote(owner);
    const note = await owner.query(api.notes.getOwned, { id });
    const slug = note!.slug;
    expect(slug).not.toBe((await owner.query(api.notes.getOwned, { id: second }))!.slug);
    expect(await t.query(api.notes.getPublished, { slug })).toBeNull();
    expect(await t.action(api.notes.readPublished, { slug })).toBeNull();
    await owner.mutation(api.notes.setPublished, { id, published: true });
    const metadata = await t.query(api.notes.getPublished, { slug });
    expect(metadata?.title).toBe('Mechanics');
    expect(metadata).not.toHaveProperty('ownerId');
    expect(metadata).not.toHaveProperty('sourceStorageId');
    const publicSource = await t.action(api.notes.readPublished, { slug });
    expect(publicSource?.source).toContain('# Mechanics');
    expect(publicSource).not.toHaveProperty('sourceStorageId');
    await owner.mutation(api.notes.setPublished, { id, published: false });
    expect(await t.query(api.notes.getPublished, { slug })).toBeNull();
    expect(await t.action(api.notes.readPublished, { slug })).toBeNull();
    await owner.mutation(api.notes.setPublished, { id, published: true });
    expect((await owner.query(api.notes.getOwned, { id }))!.slug).toBe(slug);
    expect(await t.query(api.notes.getPublished, { slug: 'does-not-exist' })).toBeNull();
  });

  it('deletes the source file and metadata together and revokes the public link', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    const id = await uploadNote(owner);
    const note = await t.run(ctx => ctx.db.get('notes', id));
    await owner.mutation(api.notes.setPublished, { id, published: true });
    await owner.mutation(api.notes.remove, { id });
    expect(await t.run(ctx => ctx.db.get('notes', id))).toBeNull();
    expect(await t.run(ctx => ctx.storage.get(note!.sourceStorageId))).toBeNull();
    expect(await owner.query(api.notes.list, {})).toEqual([]);
    expect(await t.action(api.notes.readPublished, { slug: note!.slug })).toBeNull();
  });
});

describe('authenticated file uploads', () => {
  it('rejects anonymous uploads before reading or storing files', async () => {
    const t = backend();
    expect((await t.fetch('/notes/upload?filename=note.md', { method: 'POST', body: '# Note' })).status).toBe(401);
    expect(await t.run(ctx => ctx.db.system.query('_storage').collect())).toEqual([]);
  });

  it('validates file extensions, names, UTF-8, empty content and full TeX documents', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    const cases: [string, BodyInit][] = [
      ['note.exe', '# Note'], ['note.tex', '# Note'], ['../note.md', '# Note'],
      ['a'.repeat(241) + '.md', '# Note'], ['empty.md', '  '], ['binary.md', '\u0000'],
      ['broken.md', new Uint8Array([0xc3, 0x28])],
      ['full.mathtex', '\\documentclass{article}\\begin{document}test\\end{document}'],
    ];
    for (const [filename, body] of cases) {
      expect((await owner.fetch('/notes/upload?filename=' + encodeURIComponent(filename), { method: 'POST', body })).status, filename).toBe(400);
    }
    expect(await owner.query(api.notes.list, {})).toEqual([]);
    expect(await t.run(ctx => ctx.db.system.query('_storage').collect())).toEqual([]);
  });

  it('enforces the byte limit even without a Content-Length header', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    expect((await owner.fetch('/notes/upload?filename=big.md', { method: 'POST', body: 'x'.repeat(2_000_001) })).status).toBe(413);
    expect(await t.run(ctx => ctx.db.system.query('_storage').collect())).toEqual([]);
    const id = await uploadNote(owner, 'x'.repeat(2_000_000));
    expect((await owner.action(api.notes.readOwned, { id }))?.source.length).toBe(2_000_000);
  });

  it('supports browser CORS preflight with explicit bearer authentication', async () => {
    const response = await backend().fetch('/notes/upload', { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(response.headers.has('Access-Control-Allow-Credentials')).toBe(false);
  });
});
