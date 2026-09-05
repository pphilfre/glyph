import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';

// Keep TeX out of the Markdown parser/exporter's escaping rules.
export function protectMath(source: string, namespace = 'GLYPHMATH') {
  const values: string[] = [];
  let prefix = namespace;
  while (source.includes(prefix)) prefix += 'X';
  const ranges: { start: number; end: number }[] = [];
  visit(unified().use(remarkParse).use(remarkMath).parse(source), node => {
    if ((node.type === 'math' || node.type === 'inlineMath') && node.position) {
      ranges.push({ start: node.position.start.offset!, end: node.position.end.offset! });
    }
  });
  let text = source;
  for (const range of ranges.reverse()) {
    const token = `${prefix}${values.length}END`;
    values.push(source.slice(range.start, range.end));
    text = text.slice(0, range.start) + token + text.slice(range.end);
  }
  return { text, restore: (value: string) => value.replace(new RegExp(`${prefix}(\\d+)END`, 'g'), (token, index) => values[Number(index)] ?? token) };
}

export function mapEditorText<T>(value: T, transform: (text: string) => string): T {
  if (Array.isArray(value)) return value.map(item => mapEditorText(item, transform)) as T;
  if (value && typeof value === 'object') {
    if ('type' in value && value.type === 'codeBlock') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'text' && typeof item === 'string' ? transform(item) : mapEditorText(item, transform)])) as T;
  }
  return value;
}

export function exportEditorMarkdown<T>(document: T, serialize: (blocks: T) => string) {
  const restorers: ((value: string) => string)[] = [];
  let prefix = 'GLYPHMATH';
  while (JSON.stringify(document).includes(prefix)) prefix += 'X';
  const blocks = mapEditorText(document, text => {
    const math = protectMath(text, `${prefix}${restorers.length}X`);
    restorers.push(math.restore); return math.text;
  });
  let markdown = serialize(blocks);
  for (const restore of restorers) markdown = restore(markdown);
  return markdown;
}
