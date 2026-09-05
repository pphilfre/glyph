import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';

export const MAX_NOTE_BYTES = 2_000_000;
export const NOTE_EXTENSIONS = /\.(md|markdown|mtex|mathtex|tex)$/i;

export function validateSource(source: string) {
  if (!source.trim() || source.includes('\u0000')) throw new Error('Choose a non-empty UTF-8 text note.');
  if (/^\s*\\(?:(?:documentclass|usepackage)\b|begin\s*\{(?:document|tikzpicture)\})/.test(source)) {
    throw new Error('Use Markdown with $inline$ or $$display$$ maths. Full TeX documents and packages are not supported.');
  }
}

export function sourceTitle(source: string, filename: string) {
  const heading = unified().use(remarkParse).parse(source).children.find(node => node.type === 'heading' && node.depth === 1);
  return (heading ? toString(heading) : filename.replace(NOTE_EXTENSIONS, '').replace(/[_-]/g, ' ')).trim().slice(0, 240) || 'Untitled note';
}

export function markdownSource(source: string, filename: string) {
  // A MathTeX file may be a bare equation; prose uses normal Markdown delimiters.
  return /\.(mtex|mathtex)$/i.test(filename) && !source.includes('$') && /^\s*\\/.test(source)
    ? '$$\n' + source + '\n$$' : source;
}
