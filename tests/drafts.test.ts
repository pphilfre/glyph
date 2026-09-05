import { describe, expect, it } from 'vitest';
import { api } from '../convex/_generated/api';
import { backend, uploadNote } from './convex-helpers';
import { protectMath, mapEditorText } from '../src/lib/editor-markdown';

const draft = { source: '# A new idea\n\nSome text.', blocks: JSON.stringify([{ type: 'paragraph', content: [{ type: 'text', text: 'Some text.', styles: {} }] }]) };

describe('draft editing', () => {
  it('creates privately, reopens editor data, updates imported notes and cleans up replaced files', async () => {
    const t = backend(); const owner = t.withIdentity({ subject: 'owner' });
    const created = await owner.action(api.notes.saveDraft, draft);
    expect((await owner.action(api.notes.readOwned, { id: created.id }))?.blocks).toBe(draft.blocks);
    expect(await t.action(api.notes.readPublished, { slug: created.id })).toBeNull();
    const id = await uploadNote(owner);
    const before = (await t.run(ctx => ctx.db.get('notes', id)))!;
    await owner.action(api.notes.saveDraft, { ...draft, id, expectedUpdatedAt: before.updatedAt });
    expect((await owner.action(api.notes.readOwned, { id }))?.source).toBe(draft.source);
    expect(await t.run(ctx => ctx.storage.get(before.sourceStorageId))).toBeNull();
    await owner.mutation(api.notes.remove, { id });
    expect((await t.run(ctx => ctx.db.system.query('_storage').collect())).length).toBe(2);
  });

  it('rejects unauthenticated, foreign-owner, stale and live edits without leaking files', async () => {
    const t = backend(); const owner = t.withIdentity({ subject: 'owner' });
    await expect(t.action(api.notes.saveDraft, draft)).rejects.toThrow('Sign in');
    const saved = await owner.action(api.notes.saveDraft, draft);
    const args = { ...draft, id: saved.id, expectedUpdatedAt: saved.updatedAt };
    await expect(t.withIdentity({ subject: 'other' }).action(api.notes.saveDraft, args)).rejects.toThrow('Note not found');
    await owner.action(api.notes.saveDraft, args);
    await expect(owner.action(api.notes.saveDraft, args)).rejects.toThrow('another tab');
    expect((await t.run(ctx => ctx.db.system.query('_storage').collect())).length).toBe(2);
    await owner.mutation(api.notes.setPublished, { id: saved.id, published: true, slug: 'my-new-idea' });
    await expect(owner.action(api.notes.saveDraft, args)).rejects.toThrow('Unpublish');
    expect((await t.action(api.notes.readPublished, { slug: 'my-new-idea' }))?.source).toBe(draft.source);
  });

  it('rejects invalid or excessive content', async () => {
    const owner = backend().withIdentity({ subject: 'owner' });
    for (const changes of [{ source: ' ' }, { source: 'a'.repeat(2_000_001) }, { blocks: '{}' }, { blocks: 'no json' }]) {
      await expect(owner.action(api.notes.saveDraft, { ...draft, ...changes })).rejects.toThrow();
    }
  });
});

describe('publish URLs', () => {
  it('validates URLs, reserves the example, prevents collisions, and revokes the previous URL', async () => {
    const t = backend(); const owner = t.withIdentity({ subject: 'owner' });
    const id = await uploadNote(owner); const second = await uploadNote(owner);
    for (const slug of ['test', 'ab', 'Hello', '../note', 'double--dash', '-start', 'end-', 'a'.repeat(65)]) {
      await expect(owner.mutation(api.notes.setPublished, { id, published: true, slug })).rejects.toThrow('Use 3');
    }
    await owner.mutation(api.notes.setPublished, { id, published: true, slug: 'my-note' });
    await expect(owner.mutation(api.notes.setPublished, { id: second, published: true, slug: 'my-note' })).rejects.toThrow('already taken');
    await owner.mutation(api.notes.setPublished, { id, published: false });
    await expect(owner.mutation(api.notes.setPublished, { id: second, published: true, slug: 'my-note' })).rejects.toThrow('already taken');
    await owner.mutation(api.notes.setPublished, { id, published: true, slug: 'my-updated-note' });
    expect(await t.action(api.notes.readPublished, { slug: 'my-note' })).toBeNull();
    expect(await t.action(api.notes.readPublished, { slug: 'my-updated-note' })).not.toBeNull();
  });
});

it('protects inline and display TeX, leaves code alone, and restores without altering backslashes', () => {
  const source = '# Maths\n\n$\\alpha_1$ and $x^2$.\n\n$$\n\\frac{a}{b}\n$$\n\n`$code$`';
  const math = protectMath(source);
  expect(math.text).not.toContain('\\frac');
  expect(math.text).toContain('`$code$`');
  expect(math.restore(math.text)).toBe(source);
  const blocks = [{ type: 'paragraph', content: [{ text: math.text }] }, { type: 'codeBlock', content: [{ text: math.text }] }];
  const restored = mapEditorText(blocks, math.restore);
  expect(restored[0].content[0].text).toBe(source);
  expect(restored[1].content[0].text).toBe(math.text);
});
