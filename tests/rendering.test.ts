import { describe, expect, it } from 'vitest';
import { renderNote } from '../src/lib/rendering';
import { EXAMPLE_SOURCE } from '../src/lib/example-note';

describe('Markdown and KaTeX rendering', () => {
  it('renders the mechanics example with inline and display maths and accessible MathML', async () => {
    const result = await renderNote(EXAMPLE_SOURCE, 'mechanics.md');
    expect(result.title).toBe('Mechanics of a falling body');
    expect(result.html).toContain('class="katex-display"');
    expect(result.html).toContain('class="katex-mathml"');
    expect(result.html).toContain('<mfrac>');
    expect(result.html).toContain('<strong>factor of four</strong>');
    expect(result.html).not.toContain('katex-error');
    expect(result.headings).toContainEqual({ title: 'Equations of motion', id: 'note-equations-of-motion', depth: 2 });
  });

  it('supports prose, lists, tables, quotes, links, and code without interpreting code as maths', async () => {
    const result = await renderNote('# **My note**\n\nA *short* paragraph.\n\n- One\n- Two\n\n1. First\n2. Second\n\n> Quoted\n\n[Safe](https://example.com)\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n~~~python\nprint("$notmath$")\n~~~', 'note.md');
    for (const tag of ['<em>', '<ul>', '<ol>', '<blockquote>', '<table>', '<pre>', '<code']) expect(result.html).toContain(tag);
    expect(result.title).toBe('My note');
    expect(result.html).toContain('language-python');
    expect(result.html).toContain('$notmath$');
    expect(result.html).not.toContain('class="katex');
    const inline = await renderNote(String.fromCharCode(96) + '$literal$' + String.fromCharCode(96), 'note.md');
    expect(inline.html).toContain('<code>$literal$</code>');
  });

  it('namespaces unique headings and rewrites cross references', async () => {
    const result = await renderNote('# Title\n\n## First\n\n## First\n\n### Details\n\n[First](#first)\n\n[Second](#first-1)', 'note.md');
    expect(result.html).not.toContain('<h1>');
    expect(new Set(result.headings.map(heading => heading.id)).size).toBe(3);
    expect(result.html).toContain('href="#note-first"');
    expect(result.html).toContain('href="#note-first-1"');
    expect(result.headings[2].depth).toBe(3);
  });

  it('uses a filename fallback and wraps a bare MathTeX equation', async () => {
    const note = await renderNote('\\frac{x}{2}', 'my_equation.mathtex');
    expect(note.title).toBe('my equation');
    expect(note.html).toContain('katex-display');
    expect(note.html).toContain('<mfrac>');
  });

  it('keeps malformed maths readable and preserves the surrounding note', async () => {
    const note = await renderNote('Before\n\n$$\n\\frac{\n$$\n\nAfter', 'note.md');
    expect(note.html).toContain('katex-error');
    expect(note.html).toContain('Before');
    expect(note.html).toContain('After');
  });
});

describe('rendering security', () => {
  it('discards raw HTML, executable elements, event handlers and user CSS', async () => {
    const result = await renderNote('# Safe\n\n<script>alert(1)</script>\n\n<iframe src="https://evil.test"></iframe>\n\n<p class="rail" style="position:fixed" onclick="alert(1)">Bad</p>\n\nSafe paragraph.', 'note.md');
    expect(result.html).not.toMatch(/<script|<iframe|onclick|position:fixed|class="rail"/);
    expect(result.html).toContain('Safe paragraph');
  });

  it('strips dangerous Markdown link and image protocols', async () => {
    const { html } = await renderNote('[Click](javascript:alert%281%29)\n\n![Image](data:image/svg+xml;base64,PHN2Zz4=)\n\n[Email](mailto:test@example.com)', 'note.md');
    expect(html).not.toMatch(/href="javascript:|src="data:/);
    expect(html).toContain('mailto:test@example.com');
  });

  it('disables trusted KaTeX HTML, URL and image commands', async () => {
    const { html } = await renderNote('$\\href{javascript:alert(1)}{click}$\n\n$\\htmlClass{rail}{x}$\n\n$\\includegraphics{https://evil.test/track}$', 'note.md');
    expect(html).not.toMatch(/href="javascript:|class="rail"|<img/);
  });

  it('rejects full TeX inputs with an actionable format error', async () => {
    await expect(renderNote('\\documentclass{article}\\begin{document}X\\end{document}', 'note.mathtex')).rejects.toThrow('Use Markdown');
  });

  it('allows technical notes to discuss TeX commands inside fenced code', async () => {
    const { html } = await renderNote('# File formats\n\n~~~tex\n\\documentclass{article}\n\\usepackage{amsmath}\n~~~', 'formats.md');
    expect(html).toContain('language-tex');
    expect(html).toContain('documentclass');
  });
});
