import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toText } from 'hast-util-to-text';
import GithubSlugger from 'github-slugger';
import type { Root } from 'hast';
import type { Heading, RenderedNote } from './note-types';
import { markdownSource, sourceTitle, validateSource } from './note-source';

export async function renderNote(source: string, filename: string): Promise<RenderedNote> {
  validateSource(source);
  const title = sourceTitle(source, filename);
  const headings: Heading[] = [];
  let readMinutes = 1;
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    // Raw HTML is discarded. No rehype-raw or MDX evaluation.
    .use(remarkRehype)
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: { ...defaultSchema.attributes,
        code: [['className', /^language-./, 'math-inline', 'math-display']],
      },
    })
    .use(() => (tree: Root) => {
      const slugger = new GithubSlugger();
      const anchors = new Map<string, string>();
      let removedTitle = false;
      readMinutes = Math.max(1, Math.ceil(toText(tree).split(/\s+/).length / 200));
      visit(tree, 'element', (node, index, parent) => {
        if (!/^h[1-6]$/.test(node.tagName)) return;
        const label = toText(node);
        const slug = slugger.slug(label);
        if (node.tagName === 'h1' && !removedTitle && parent && index !== undefined) {
          removedTitle = true;
          anchors.set(slug, 'main-content');
          parent.children.splice(index, 1);
          return index;
        }
        const id = 'note-' + slug;
        node.properties.id = id;
        anchors.set(slug, id);
        headings.push({ id, title: label, depth: Math.max(2, Number(node.tagName[1])) });
      });
      visit(tree, 'element', node => {
        if (node.tagName !== 'a') return;
        node.properties.rel = ['noreferrer', 'noopener'];
        const href = node.properties.href;
        if (typeof href === 'string' && href.startsWith('#')) {
          let anchor = href.slice(1);
          try { anchor = decodeURIComponent(anchor); } catch { /* Keep malformed fragments inert. */ }
          if (anchors.has(anchor)) node.properties.href = '#' + anchors.get(anchor);
        }
      });
    })
    // Sanitise user markup BEFORE KaTeX adds its trusted styles and MathML.
    .use(rehypeKatex, { trust: false, strict: 'warn', maxExpand: 1000, maxSize: 20, output: 'htmlAndMathml' })
    .use(rehypeStringify)
    .process(markdownSource(source, filename));
  return { html: String(result), title, headings, readMinutes };
}
