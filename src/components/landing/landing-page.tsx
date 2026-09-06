import Link from 'next/link';
import { renderToString } from 'katex';
import { ArrowDown, ArrowUpRight, BookOpen, Check, Code2, FileText, FileUp, Globe2, Link2, LockKeyhole, PenLine, Plus, Sigma } from 'lucide-react';
import { LandingNavigation, ScrollStory } from './landing-interactions';
import styles from './landing.module.css';

// Fixed, authored expressions use the same math renderer as published notes.
// This stays in the server component; no KaTeX JavaScript is sent to the browser.
const motionEquation = renderToString(String.raw`y(t) = y_0 + v_0t - \frac{1}{2}gt^2`, { trust: false, output: 'htmlAndMathml' });
const integralEquation = renderToString(String.raw`\int_a^b f'(x)\,dx = f(b) - f(a)`, { trust: false, output: 'htmlAndMathml', displayMode: true });

const fragments = [
  String.raw`# A thought worth sharing    ∑  ∂  ∫    \begin{document}    0101`,
  String.raw`E = mc²    ## The little details    f(x) = ∫ g(t) dt    →`,
  String.raw`\frac{1}{2}mv^2 + mgy    # Mechanics    α β γ    [an idea](…)`,
  String.raw`from math import sqrt    ∞    \section{A new perspective}`,
  String.raw`y(t) = y₀ + v₀t − ½gt²    **make it clear**    λ = h/p`,
];

function NoteSphere() {
  return <div className={styles.sphere} aria-hidden="true">
    <svg viewBox="0 0 1000 680" fill="none">
      <defs>
        <radialGradient id="glyph-sphere-fill" cx="50%" cy="12%" r="75%"><stop stopColor="#a94e16" stopOpacity=".27" /><stop offset=".65" stopColor="#6a280b" stopOpacity=".08" /><stop offset="1" stopOpacity="0" /></radialGradient>
        <linearGradient id="glyph-sphere-stroke" x1="150" y1="520" x2="780" y2="130" gradientUnits="userSpaceOnUse"><stop stopColor="#8a3810" stopOpacity="0" /><stop offset=".5" stopColor="#d58743" /><stop offset="1" stopColor="#9e511f" stopOpacity=".25" /></linearGradient>
        <linearGradient id="glyph-sphere-mask" x2="0" y2="1"><stop stopColor="white" /><stop offset=".28" stopColor="white" /><stop offset=".78" stopColor="black" /></linearGradient>
        <filter id="glyph-sphere-glow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="9" /></filter>
        <mask id="glyph-sphere-fade"><rect width="1000" height="680" fill="url(#glyph-sphere-mask)" /></mask>
        <clipPath id="glyph-sphere-clip"><circle cx="500" cy="455" r="350" /></clipPath>
      </defs>
      <g mask="url(#glyph-sphere-fade)">
        <circle cx="500" cy="455" r="350" stroke="#c96b27" strokeWidth="9" opacity=".55" filter="url(#glyph-sphere-glow)" />
        <circle cx="500" cy="455" r="350" fill="url(#glyph-sphere-fill)" stroke="url(#glyph-sphere-stroke)" strokeWidth="1" />
        <g clipPath="url(#glyph-sphere-clip)" className={styles.sphereLetters}>
          {Array.from({ length: 29 }, (_, row) => <text key={row} x={100 - (row % 3) * 37} y={115 + row * 19} fill={row % 4 === 0 ? '#cc8a4a' : '#9c6233'} opacity={.27 + (row % 4) * .1}>{fragments[row % fragments.length]} {fragments[(row + 2) % fragments.length]}</text>)}
          {[90, 170, 250].map((radius) => <ellipse key={radius} cx="500" cy="455" rx={radius} ry="350" stroke="#c98044" strokeOpacity=".12" />)}
          {[235, 340, 455, 570].map((y) => <ellipse key={y} cx="500" cy={y} rx="350" ry="44" stroke="#c98044" strokeOpacity=".1" />)}
        </g>
      </g>
    </svg>
  </div>;
}

function NoteContent() {
  return <div className={styles.noteContent}>
    <div className={styles.noteMeta}>Physics <span>3 min read</span></div>
    <h4>Mechanics of a falling body</h4>
    <p className={styles.noteLead}>A short derivation of vertical motion, from Newton’s second law to the conservation of energy.</p>
    <div className={styles.noteSection}>Equations of motion</div>
    <p>Gravity acts downward. A few simple assumptions tell us how a body moves.</p>
    <div className={styles.equation} dangerouslySetInnerHTML={{ __html: motionEquation }} />
    <div className={styles.noteQuote}>The value of a derivation is not only its answer. It makes the assumptions visible.</div>
  </div>;
}

function ProductPreview({ stage }: { stage: number }) {
  return <div className={styles.previewWindow}>
    <div className={styles.previewChrome}><span className={styles.windowDots}><i /><i /><i /></span><span>{stage === 0 ? 'mechanics.md' : stage === 1 ? 'Private preview' : '/p/mechanics-of-a-falling-body'}</span>{stage === 2 ? <Globe2 size={13} /> : <LockKeyhole size={13} />}</div>
    {stage === 0 ? <div className={styles.sourcePreview}>
      <div className={styles.sourceHeading}><FileText size={16} /><span>Markdown</span><span className={styles.draftPill}>Private draft</span></div>
      <pre><code><span># Mechanics of a falling body</span>{'\n\nA short derivation of vertical motion,\nfrom Newton’s second law to the\nconservation of energy.\n\n'}<span>## Equations of motion</span>{'\n\nGravity acts downward. A few simple\nassumptions tell us how a body moves.\n\n'}<span>{'$$\ny(t) = y_0 + v_0t - \\frac{1}{2}gt^2\n$$'}</span></code></pre>
    </div> : <div className={styles.readerPreview}>
      <div className={styles.previewBar}><span className={styles.previewGlyph}>Glyph</span><span className={stage === 2 ? styles.publishedPill : styles.privatePill}>{stage === 2 ? <Globe2 size={12} /> : <LockKeyhole size={12} />}{stage === 2 ? 'Published' : 'Only you'}</span></div>
      <NoteContent />
      <div className={styles.readerFoot}>{stage === 2 ? <><Link2 size={13} /> A link anyone can read. No account needed.</> : <><Check size={13} /> Review every detail before you publish.</>}</div>
    </div>}
  </div>;
}

const steps = [
  { id: 'bring-your-notes', title: 'Start with what you know.', body: 'A fresh thought or a folder full of notes. Write in the editor, or bring your Markdown, MathTeX, and LaTeX files into Glyph.', icon: FileUp },
  { id: 'refine-your-draft', title: 'Give the details their due.', body: 'Edit your private draft, then see it in a clean reading view. Equations, code, and headings each have room to make sense.', icon: PenLine },
  { id: 'share-your-page', title: 'An idea becomes a link.', body: 'Choose a custom URL and publish when you’re ready. Anyone with the link can read your note, without signing in.', icon: Link2 },
];

const questions = [
  ['What can I bring into Glyph?', 'Upload Markdown (.md or .markdown), MathTeX (.mtex or .mathtex), or LaTeX (.tex) files up to 2 MB. You can also start a new note directly in the editor.'],
  ['Will my LaTeX document look exactly the same?', 'Glyph converts supported LaTeX text, headings, lists, and equations into a web note. It does not reproduce page layouts or load packages. Unsupported commands stay as source with a conversion notice, so always review the preview and keep your original file.'],
  ['Are my notes private?', 'New notes and saved drafts are private. Only you can access them until you choose to publish. You can unpublish a note to stop future public access; copies already saved by readers cannot be recalled.'],
  ['Do readers need a Glyph account?', 'No. A published note is a public web page. Share its link and anyone can open it, read it, navigate its headings, and copy code.'],
  ['Can I change a note after publishing?', 'Yes. Unpublish the note first, edit and save your changes, then publish again when you’re ready. Your chosen URL stays reserved while the note is unpublished.'],
];

export function LandingPage() {
  return <div className={styles.landing}>
    <a href="#main-content" className={styles.skipLink}>Skip to content</a>
    <LandingNavigation />
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="hero-title">
        <NoteSphere />
        <div className={styles.heroCopy}>
          <h1 id="hero-title">Good ideas deserve<br />a page of their own.</h1>
          <p>Turn your Markdown and mathematical notes into beautiful,<br className={styles.desktopBreak} /> shareable web pages. A little less friction. A lot more clarity.</p>
          <div className={styles.heroActions}><Link href="/sign-up" className={styles.primaryButton}>Get started with Glyph <ArrowUpRight size={16} /></Link><Link href="/p/test" className={styles.secondaryButton}>Read an example <BookOpen size={16} /></Link></div>
        </div>
        <a className={styles.scrollCue} href="#how-it-works">From a first draft to an open tab <ArrowDown size={14} /></a>
      </section>

      <section id="how-it-works" className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.sectionIntro}><h2 id="workflow-title">From your notebook.<br />To someone’s next discovery.</h2></div>
        <ScrollStory>
          <div className={styles.storyCopy}>
            {steps.map((step, index) => <article id={step.id} key={step.id} className={styles.storyStep} data-story-step={index}>
              <div className={styles.stepNumber}><step.icon size={17} /><span> {['Write or import', 'Edit & preview', 'Publish & share'][index]}</span></div>
              <h3>{step.title}</h3><p>{step.body}</p>
              {index === 2 && <Link href="/p/test" className={styles.inlineLink}>Explore a published note <ArrowUpRight size={15} /></Link>}
              <div className={styles.inlinePreview}><ProductPreview stage={index} /></div>
            </article>)}
          </div>
          <div className={styles.pinnedPreview} aria-hidden="true">
            <div className={styles.previewStage}>{steps.map((step, index) => <div key={step.id} className={styles.previewPanel} data-panel={index}><ProductPreview stage={index} /></div>)}</div>
            <div className={styles.previewLegend}>{['Your source', 'Your draft', 'Your page'].map((label, index) => <span key={label} data-legend={index}><i />{label}</span>)}</div>
            <div className={styles.storyProgress}><span /></div>
          </div>
        </ScrollStory>
      </section>

      <section id="made-for-your-notes" className={styles.features} aria-labelledby="features-title">
        <div className={styles.featureHeading}><div><h2 id="features-title">Technical notes.<br />Human-friendly pages.</h2></div></div>
        <div className={styles.featureGrid}>
          <article><div className={styles.mathVisual} dangerouslySetInnerHTML={{ __html: integralEquation }} /><div className={styles.featureCopy}><Sigma size={19} /><h3>Math that reads like math.</h3></div></article>
          <article className={styles.codeFeature}><div className={styles.codeVisual}><div><span>Python</span><Code2 size={14} /></div><pre><code><span>from</span> math <span>import</span> sqrt{'\n\n'}flight_time = sqrt(2 * height / gravity){'\n'}<span>print</span>(flight_time)</code></pre></div><div className={styles.featureCopy}><Code2 size={19} /><h3>Room for the implementation.</h3></div></article>
          <article className={styles.readingFeature}><div className={styles.contentsVisual}><span>On this page</span><div>Framing the problem</div><div className={styles.contentsActive}>Equations of motion</div><div>Energy form</div><div>A worked example</div></div><div className={styles.featureCopy}><BookOpen size={19} /><h3>A clear path through an idea.</h3></div></article>
        </div>
      </section>

      <section className={styles.privacy} aria-labelledby="privacy-title"><div className={styles.privacyMark}><LockKeyhole size={28} strokeWidth={1.25} /></div><div><h2 id="privacy-title">Your work. Your moment to share.</h2><p>Drafts stay private. Publishing is your decision. Choose your link, share it with the world, and unpublish whenever you need to.</p></div><Link href="/sign-up" className={styles.inlineLink}>Start a private draft <ArrowUpRight size={16} /></Link></section>

      <section id="questions" className={styles.faq} aria-labelledby="faq-title"><div><h2 id="faq-title">A few things<br />worth knowing.</h2><Link href="/p/test" className={styles.inlineLink}>See Glyph in the wild <ArrowUpRight size={15} /></Link></div><div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>

      <section className={styles.finalCta} aria-labelledby="start-title"><span className={styles.finalGlyph} aria-hidden="true">g<span>.</span></span><h2 id="start-title">You’ve done the thinking.<br />Give it a home.</h2><p>Your next note could be someone’s next lightbulb moment.</p><Link href="/sign-up" className={styles.primaryButton}>Get started with Glyph <ArrowUpRight size={16} /></Link></section>
    </main>
    <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>Glyph<span>.</span></Link><nav aria-label="Footer navigation"><Link href="/p/test">Example note</Link><a href="#questions">Questions</a><Link href="/sign-in">Sign in <ArrowUpRight size={12} /></Link></nav></footer>
  </div>;
}
