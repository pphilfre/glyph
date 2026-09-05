import { describe, expect, it } from 'vitest';
import { convertLatex } from '../src/lib/latex-import';
import { renderNote } from '../src/lib/rendering';
import { api } from '../convex/_generated/api';
import { backend, uploadNote } from './convex-helpers';

const document = String.raw`\documentclass{article}
\usepackage{amsmath}
\title{Mechanics \textbf{notes}}
\begin{document}
\maketitle
\section{Energy}
The \emph{kinetic energy} is \(E = \frac{1}{2}mv^2\).
\begin{equation}\label{eq:energy}
E = mc^2
\end{equation}
\subsection{Steps}
\begin{enumerate}
\item Measure mass.
\item Compute \textbf{energy}.
\begin{itemize}
\item Use SI units.
\end{itemize}
\end{enumerate}
\begin{align*}
a &= b + c \\
d &= \frac{x}{2}
\end{align*}
\end{document}`;

describe('LaTeX imports', () => {
  it('converts a document to readable Markdown with nested formatting, lists and rendered maths', async () => {
    const converted = convertLatex(document);
    expect(converted.warnings).toEqual([]);
    const note = await renderNote(converted.source, 'mechanics.md');
    expect(note.title).toBe('Mechanics notes');
    expect(note.headings.map(heading => heading.title)).toEqual(['Energy', 'Steps']);
    for (const text of ['<em>kinetic energy</em>', '<strong>energy</strong>', '<ol>', '<ul>', 'class="katex-display"', '<mfrac>']) expect(note.html).toContain(text);
    expect(note.html).not.toContain('katex-error');
    expect(converted.source).not.toContain('documentclass');
    expect(converted.source).not.toContain('label{');
  });

  it('stores the converted file and uses the same content for private and published reads', async () => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    const id = await uploadNote(owner, document, 'mechanics.TEX');
    const preview = await owner.action(api.notes.readOwned, { id });
    expect(preview?.note.filename).toBe('mechanics.md');
    expect(preview?.note.title).toBe('Mechanics notes');
    expect(preview?.source).toContain('## Energy');
    expect((await renderNote(preview!.source, preview!.note.filename)).html).toContain('katex-mathml');
    await owner.mutation(api.notes.setPublished, { id, published: true });
    expect((await t.action(api.notes.readPublished, { slug: preview!.note.slug }))?.source).toBe(preview?.source);
  });

  it('preserves unsupported commands, external inputs, macros and environments as inert source', async () => {
    const converted = convertLatex(String.raw`\documentclass{article}
\newcommand{\energy}{E=mc^2}
\begin{document}
Before \input{secrets.tex} \write18{curl evil.test} \ref{eq:one}
\begin{tikzpicture}\draw (0,0) -- (1,1);\end{tikzpicture}
After
\end{document}`);
    const { html } = await renderNote(converted.source, 'note.md');
    expect(converted.warnings).toHaveLength(1);
    for (const text of ['LaTeX import', 'newcommand', 'secrets.tex', 'write18', 'tikzpicture', 'Before', 'After']) expect(html).toContain(text);
    expect(html).toContain('language-tex');
  });

  it('keeps verbatim content intact and treats LaTeX prose as text instead of Markdown or HTML', async () => {
    const { source } = convertLatex(String.raw`\title{Escapes}
Cost is 50\% and \$5. % hidden comment
<script>alert(1)</script> *literal* [link](javascript:alert)
\begin{verbatim}
% keep this $literal$ \input{file}
${String.fromCharCode(96).repeat(3)}
\end{verbatim}
\textbf{Nested \emph{words}}`);
    const { html } = await renderNote(source, 'note.md');
    expect(html).toContain('50%');
    expect(html).toContain('$5');
    expect(html).not.toContain('hidden comment');
    expect(html).toContain('% keep this $literal$');
    expect(html).toContain('*literal*');
    expect(html).toContain('<strong>Nested <em>words</em></strong>');
    expect(html).not.toMatch(/<script|href="javascript:|katex-mathml/);
  });

  it('keeps unsafe URLs inert', async () => {
    const { source } = convertLatex(String.raw`\href{javascript:alert(1)}{Click} \href{https://example.com}{Safe}`);
    const { html } = await renderNote(source, 'note.md');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com"');
  });

  it('supports comments before arguments, all common math delimiters and footnotes', async () => {
    const { source } = convertLatex(String.raw`\title % comment
{Equations}
\section{Examples}
Inline $x^2$ and \ensuremath{y^2}.
\[ \frac{a}{b} \]
$$ c^2 $$
A note\footnote{More \emph{detail}.}.
\begin{quote}Quoted text.\end{quote}`);
    const note = await renderNote(source, 'equations.md');
    expect(note.title).toBe('Equations');
    expect(note.html).toContain('More <em>detail</em>.');
    expect(note.html).toContain('<blockquote>');
    expect(note.html).toContain('<mfrac>');
    expect(note.html).not.toContain('katex-error');
    expect(note.html.match(/class="katex-display"/g)).toHaveLength(2);
  });

  it('saves conversion notices with unsupported source for review in the preview', async () => {
    const owner = backend().withIdentity({ subject: 'owner' });
    const id = await uploadNote(owner, String.raw`\section{Diagram}\begin{tikzpicture}Drawing\end{tikzpicture}`, 'diagram.tex');
    const preview = await owner.action(api.notes.readOwned, { id });
    expect(preview?.source).toContain('LaTeX import:');
    expect(preview?.source).toContain('\\begin{tikzpicture}Drawing\\end{tikzpicture}');
  });

  it.each([
    String.raw`\section{Unclosed`,
    String.raw`\begin{document}Missing end`,
    String.raw`Missing \(end`,
    String.raw`Missing $end`,
    String.raw`\documentclass{article}% no body`,
    '{'.repeat(66) + 'deep' + '}'.repeat(66),
  ])('rejects malformed or empty converted files without storing anything: %s', async source => {
    const t = backend();
    const owner = t.withIdentity({ subject: 'owner' });
    const response = await owner.fetch('/notes/upload?filename=broken.tex', { method: 'POST', body: source });
    expect(response.status).toBe(400);
    expect(await owner.query(api.notes.list, {})).toEqual([]);
    expect(await t.run(ctx => ctx.db.system.query('_storage').collect())).toEqual([]);
  });

  it('enforces the size limit on converted content too', async () => {
    const owner = backend().withIdentity({ subject: 'owner' });
    const response = await owner.fetch('/notes/upload?filename=large.tex', { method: 'POST', body: '*'.repeat(1_000_001) });
    expect(response.status).toBe(413);
    expect(await owner.query(api.notes.list, {})).toEqual([]);
  });
});
