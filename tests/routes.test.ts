import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ token: vi.fn(), fetchAction: vi.fn(), render: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireConvexToken: mocks.token }));
vi.mock('convex/nextjs', () => ({ fetchAction: mocks.fetchAction }));
vi.mock('@/lib/rendering', () => ({ renderNote: mocks.render }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('@/components/shell', () => ({ Shell: () => null }));
vi.mock('@/components/document/reader', () => ({ Reader: () => null }));
vi.mock('@/components/document/note-actions', () => ({ NoteActions: () => null }));
import NotePreview from '../src/app/notes/[id]/page';
import PublishedPage from '../src/app/p/[slug]/page';
import { api } from '../convex/_generated/api';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud');
  mocks.token.mockResolvedValue('verified-clerk-token');
  mocks.render.mockResolvedValue({ title: 'Note', html: '<p>Note</p>', headings: [], readMinutes: 1 });
});
afterEach(() => vi.unstubAllEnvs());

describe('Next.js private and public routes', () => {
  it('forwards the Clerk Convex token for an owner preview', async () => {
    mocks.fetchAction.mockResolvedValue({ note: { id: 'note_id', filename: 'note.md' }, source: '# Note' });
    await NotePreview({ params: Promise.resolve({ id: 'note_id' }), searchParams: Promise.resolve({}) });
    expect(mocks.fetchAction).toHaveBeenCalledWith(api.notes.readOwned, { id: 'note_id' }, { token: 'verified-clerk-token' });
    expect(mocks.render).toHaveBeenCalledWith('# Note', 'note.md');
  });

  it('does not query or render a private preview before sign-in', async () => {
    mocks.token.mockRejectedValue(new Error('SIGN_IN'));
    await expect(NotePreview({ params: Promise.resolve({ id: 'note_id' }), searchParams: Promise.resolve({}) })).rejects.toThrow('SIGN_IN');
    expect(mocks.fetchAction).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it('returns not found when Convex rejects ownership', async () => {
    mocks.fetchAction.mockResolvedValue(null);
    await expect(NotePreview({ params: Promise.resolve({ id: 'note_id' }), searchParams: Promise.resolve({}) })).rejects.toThrow('NOT_FOUND');
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it('reads published notes without requiring or forwarding authentication', async () => {
    const slug = 'a'.repeat(32);
    mocks.fetchAction.mockResolvedValue({ filename: 'note.md', title: 'Note', source: '# Note' });
    await PublishedPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });
    expect(mocks.token).not.toHaveBeenCalled();
    expect(mocks.fetchAction).toHaveBeenCalledWith(api.notes.readPublished, { slug });
  });

  it('returns not found for an unpublished public URL', async () => {
    mocks.fetchAction.mockResolvedValue(null);
    await expect(PublishedPage({ params: Promise.resolve({ slug: 'a'.repeat(32) }), searchParams: Promise.resolve({}) })).rejects.toThrow('NOT_FOUND');
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
