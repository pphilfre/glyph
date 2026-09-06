'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import styles from './landing.module.css';

export function LandingNavigation() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return <header className={styles.header} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      menuButton.current?.focus();
    }
  }}>
    <nav className={styles.nav} aria-label="Main navigation">
      <Link href="/" className={styles.brand} aria-label="Glyph home">g<span>.</span><span className={styles.brandName}>Glyph</span></Link>
      <div className={styles.desktopLinks}>
        <a href="#how-it-works">How it works</a>
        <a href="#made-for-your-notes">Features</a>
        <Link href="/p/test">Example note</Link>
      </div>
      <Link href="/sign-in" className={styles.navSignIn}>Sign in</Link>
      <button ref={menuButton} className={styles.menuButton} aria-expanded={open} aria-controls="landing-mobile-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div id="landing-mobile-nav" className={styles.mobileLinks} hidden={!open} onClick={() => setOpen(false)}>
        <a href="#how-it-works">How it works</a>
        <a href="#made-for-your-notes">Features</a>
        <Link href="/p/test">Read an example note</Link>
        <Link href="/sign-up">Get started with Glyph</Link>
      </div>
    </nav>
  </header>;
}

/** Observe stage changes; continuous motion stays on native CSS timelines. */
export function ScrollStory({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const media = window.matchMedia('(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)');
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      element.dataset.enhanced = String(media.matches);
      if (!media.matches) return;
      const steps = [...element.querySelectorAll<HTMLElement>('[data-story-step]')];
      observer = new IntersectionObserver(() => {
        // Resolve from current geometry, including jumps that skip a whole step.
        const next = steps.findIndex((step) => step.getBoundingClientRect().bottom > window.innerHeight * .45);
        element.dataset.stage = String(next === -1 ? steps.length - 1 : next);
      }, { rootMargin: '-35% 0px -45% 0px', threshold: 0 });
      steps.forEach((step) => observer?.observe(step));
    };
    configure();
    media.addEventListener('change', configure);
    return () => { observer?.disconnect(); media.removeEventListener('change', configure); };
  }, []);

  return <div ref={root} className={styles.story} data-stage="0">{children}</div>;
}
