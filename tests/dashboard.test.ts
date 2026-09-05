import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NotesDashboard } from '../src/components/notes-dashboard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/components/upload-note', () => ({
  UploadNote: () => createElement('div', { 'data-testid': 'upload' }, 'Choose a file'),
}));

describe('dashboard upload availability', () => {
  it('opens the sidebar upload link even when the notes query failed', () => {
    const html = renderToStaticMarkup(createElement(NotesDashboard, { notes: [], loadError: true, showUpload: true }));
    expect(html).toContain('data-testid="upload"');
    expect(html).toContain('Your notes couldn’t be loaded');
    expect(html).toContain('Try again');
    expect(html).toContain('Close upload');
  });

  it('offers an upload button when the notes query failed', () => {
    const html = renderToStaticMarkup(createElement(NotesDashboard, { notes: [], loadError: true, showUpload: false }));
    expect(html).toContain('Upload note');
    expect(html).not.toContain('data-testid="upload"');
    expect(html).not.toContain('Take a look at an example');
  });

  it('automatically offers upload for a successfully loaded empty workspace', () => {
    const html = renderToStaticMarkup(createElement(NotesDashboard, { notes: [], loadError: false, showUpload: false }));
    expect(html).toContain('data-testid="upload"');
    expect(html).not.toContain('Your notes couldn’t be loaded');
  });
});
