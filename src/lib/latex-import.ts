// A bounded text converter, not a TeX engine: never execute commands, load
// packages, expand macros, or read files/URLs supplied by a document.
const MAX_DEPTH = 64;
const headings: Record<string, number> = { part: 2, chapter: 2, section: 2, subsection: 3, subsubsection: 4, paragraph: 5, subparagraph: 6 };
const mathEnvironments = new Set(['equation', 'equation*', 'displaymath', 'math', 'align', 'align*', 'gather', 'gather*', 'multline', 'multline*', 'eqnarray', 'eqnarray*']);

function code(source: string, block = false) {
  let longest = 0;
  for (const match of source.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  const fence = '`'.repeat(Math.max(block ? 3 : 1, longest + 1));
  return block ? `\n\n${fence}tex\n${source}\n${fence}\n\n` : `${fence} ${source.replace(/\n/g, ' ')} ${fence}`;
}

function escapeText(source: string) {
  return source.replace(/([\\`*_{}\[\]<>#!|$])/g, '\\$1');
}

export function convertLatex(source: string): { source: string; warnings: string[] } {
  if (!source.trim() || source.includes('\u0000')) throw new Error('Choose a non-empty UTF-8 text note.');
  const warnings = new Set<string>();
  const warn = () => warnings.add('Some LaTeX commands could not be converted and are shown as source. Packages, custom macros, references and external files are not resolved.');

  function parse(text: string, depth = 0, list?: 'itemize' | 'enumerate' | 'description'): string {
    if (depth > MAX_DEPTH) throw new Error('This TeX file is nested too deeply. Simplify it and try again.');
    let pos = 0;
    let output = '';
    let itemCount = 0;
    const space = () => {
      while (pos < text.length) {
        if (/\s/.test(text[pos])) pos++;
        else if (text[pos] === '%') { while (pos < text.length && text[pos] !== '\n') pos++; }
        else break;
      }
    };
    function group(open = '{', close = '}') {
      space();
      if (text[pos] !== open) throw new Error(`This TeX file has a missing ${open} argument. Check it and try again.`);
      const start = ++pos;
      let level = 1;
      while (pos < text.length) {
        if (text[pos] === '\\') { pos += 2; continue; }
        if (text[pos] === '%') { while (pos < text.length && text[pos] !== '\n') pos++; continue; }
        if (text[pos] === open) level++;
        if (text[pos] === close && --level === 0) {
          return text.slice(start, pos++);
        }
        pos++;
      }
      throw new Error('This TeX file has an unclosed argument. Check its braces and try again.');
    }
    function optional() {
      space();
      return text[pos] === '[' ? group('[', ']') : undefined;
    }
    function delimited(end: string) {
      const start = pos;
      while (pos < text.length) {
        if (text.startsWith(end, pos)) { const body = text.slice(start, pos); pos += end.length; return body; }
        if (text[pos] === '%') { while (pos < text.length && text[pos] !== '\n') pos++; }
        else if (text[pos] === '\\') pos += 2;
        else pos++;
      }
      throw new Error(`This TeX file has unclosed maths (expected ${end}).`);
    }
    function environment(name: string) {
      const start = pos;
      // Scan environment tokens once; matching names support nested lists.
      const tokens = /\\(begin|end)\s*\{([^{}]+)\}|\\[^a-zA-Z]|%[^\n]*/g;
      tokens.lastIndex = pos;
      let level = 1;
      let match: RegExpExecArray | null;
      while ((match = tokens.exec(text))) {
        if (match[2] !== name) continue;
        level += match[1] === 'begin' ? 1 : -1;
        if (!level) { pos = tokens.lastIndex; return text.slice(start, match.index); }
      }
      throw new Error(`This TeX file has an unclosed ${name} environment.`);
    }
    function math(body: string, display: boolean) {
      // KaTeX does not implement document labels or equation numbering.
      body = body.replace(/\\label\s*\{[^{}]*\}/g, '').trim();
      return display ? `\n\n$$\n${body}\n$$\n\n` : `$${body}$`;
    }
    while (pos < text.length) {
      const char = text[pos];
      if (char === '%') { while (pos < text.length && text[pos] !== '\n') pos++; continue; }
      if (char === '$') {
        const delimiter = text.startsWith('$$', pos) ? '$$' : '$';
        pos += delimiter.length;
        output += math(delimited(delimiter), delimiter === '$$');
        continue;
      }
      if (char === '{') { output += parse(group(), depth + 1); continue; }
      if (char === '}') throw new Error('This TeX file has an unexpected closing brace.');
      if (char !== '\\') {
        const start = pos++;
        while (pos < text.length && !'\\%${}'.includes(text[pos])) pos++;
        output += escapeText(text.slice(start, pos)).replace(/~/g, '\u00a0');
        continue;
      }
      const start = pos++;
      if (pos === text.length) throw new Error('This TeX file ends with an incomplete command.');
      const commandStart = pos;
      while (/[a-zA-Z]/.test(text[pos] ?? '') && pos < text.length) pos++;
      const name = text.slice(commandStart, pos) || text[pos++];
      if (text[pos] === '*' && name.length > 1) pos++;
      if (name === '(' || name === '[') { output += math(delimited(name === '(' ? '\\)' : '\\]'), name === '['); continue; }
      if ('%$&#_{}'.includes(name)) { output += escapeText(name); continue; }
      if (name === '\\') { optional(); output += '  \n'; continue; }
      if (name === ' ') { output += ' '; continue; }
      if (name === 'verb') {
        const delimiter = text[pos++];
        const end = text.indexOf(delimiter, pos);
        if (!delimiter || end === -1) throw new Error('This TeX file has an unclosed verb command.');
        output += code(text.slice(pos, end)); pos = end + 1; continue;
      }
      if (name === 'begin') {
        const env = group();
        const body = environment(env);
        if (mathEnvironments.has(env)) {
          const base = env.replace('*', '');
          const wrapper = base === 'align' || base === 'eqnarray' ? 'aligned' : base === 'gather' || base === 'multline' ? 'gathered' : '';
          output += math(wrapper ? `\\begin{${wrapper}}${body}\\end{${wrapper}}` : body, env !== 'math');
        } else if (env === 'verbatim' || env === 'lstlisting') output += code(body, true);
        else if (env === 'document' || env === 'center' || env === 'flushleft' || env === 'flushright') output += '\n\n' + parse(body, depth + 1) + '\n\n';
        else if (env === 'itemize' || env === 'enumerate' || env === 'description') {
          const items = parse(body, depth + 1, env).trim();
          output += '\n\n' + (list ? items.split('\n').map(line => '    ' + line).join('\n') : items) + '\n\n';
        }
        else if (env === 'quote' || env === 'quotation' || env === 'abstract') output += '\n\n' + parse(body, depth + 1).trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n';
        else { warn(); output += code(text.slice(start, pos), true); }
        continue;
      }
      if (Object.hasOwn(headings, name) || name === 'title') {
        optional();
        output += `\n\n${'#'.repeat(name === 'title' ? 1 : headings[name])} ${parse(group(), depth + 1).trim().replace(/\s*\n\s*/g, ' ')}\n\n`;
        continue;
      }
      if (name === 'textbf' || name === 'emph' || name === 'textit') {
        const marker = name === 'textbf' ? '**' : '*';
        output += marker + parse(group(), depth + 1) + marker; continue;
      }
      if (name === 'texttt' || name === 'url') { output += code(group()); continue; }
      if (name === 'textrm' || name === 'textnormal' || name === 'mbox') { output += parse(group(), depth + 1); continue; }
      if (name === 'footnote') { output += ' (' + parse(group(), depth + 1) + ')'; continue; }
      if (name === 'ensuremath') { output += math(group(), false); continue; }
      if (name === 'href') {
        const url = group();
        const label = parse(group(), depth + 1);
        output += /^https?:\/\/[^\s<>]+$/i.test(url) ? `[${label}](<${url}>)` : `${label} (${code(url)})`;
        continue;
      }
      if (name === 'item' && list) {
        const label = optional();
        output += '\n' + (list === 'enumerate' ? `${++itemCount}. ` : '- ') + (label ? `**${parse(label, depth + 1)}** ` : '');
        continue;
      }
      if (name === 'documentclass' || name === 'usepackage') { optional(); group(); continue; }
      if (name === 'author' || name === 'date') { output += '\n\n' + parse(group(), depth + 1) + '\n\n'; continue; }
      if (name === 'maketitle' || name === 'noindent') continue;
      if (name === 'par' || name === 'newpage' || name === 'clearpage') { output += '\n\n'; continue; }
      if (name === 'LaTeX' || name === 'TeX') { output += name; continue; }
      // Preserve unknown commands and their arguments verbatim, so unsupported
      // content is visible instead of silently disappearing or being executed.
      warn();
      while (/[0-9]/.test(text[pos] ?? '') && pos < text.length) pos++;
      while (true) {
        const before = pos;
        space();
        if (text[pos] === '{') group();
        else if (text[pos] === '[') group('[', ']');
        else { pos = before; break; }
      }
      output += code(text.slice(start, pos));
    }
    return output;
  }

  const converted = parse(source.replace(/\r\n?/g, '\n')).trim();
  if (!converted) throw new Error('This TeX file has no note content to import.');
  const notices = [...warnings];
  return { source: (notices.length ? '> **LaTeX import:** ' + notices.join(' ') + '\n\n' : '') + converted + '\n', warnings: notices };
}
