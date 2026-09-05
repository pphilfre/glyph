// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { BlockNoteEditor } from '@blocknote/core';
import { exportEditorMarkdown, mapEditorText, protectMath } from '../src/lib/editor-markdown';
import { renderNote } from '../src/lib/rendering';

it('round-trips actual BlockNote blocks with headings, tables, code, links and TeX', async () => {
  const source = '# Mechanics\n\nEnergy is $E=mc^2$, with $\\alpha_1$.\n\n$$\n\\frac{a}{b}\n$$\n\n## Details\n\n- First\n- Second\n\n[Reference](https://example.com)\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```tex\n$code$\n```';
  const math = protectMath(source);
  const editor = BlockNoteEditor.create();
  editor.replaceBlocks(editor.document, mapEditorText(editor.tryParseMarkdownToBlocks(math.text), math.restore));
  const markdown = exportEditorMarkdown(editor.document, blocks => editor.blocksToMarkdownLossy(blocks));
  expect(markdown).toContain('$E=mc^2$');
  expect(markdown).toContain('$\\alpha_1$');
  expect(markdown).toContain('$$\n\\frac{a}{b}\n$$');
  expect(markdown).toContain('$code$');
  expect(markdown).toContain('https://example.com');
  const rendered = await renderNote(markdown, 'note.md');
  expect(rendered.title).toBe('Mechanics');
  expect(rendered.html).toContain('katex');
  expect(rendered.html).toContain('<table>');
  expect(rendered.headings.some(heading => heading.title === 'Details')).toBe(true);
  const reopened = BlockNoteEditor.create({ initialContent: JSON.parse(JSON.stringify(editor.document)) });
  expect(reopened.document).toEqual(editor.document);
});
