 'use client';
import { Check, Monitor } from 'lucide-react';
import { themes } from '@/lib/themes';
import { useAppearance } from './theme-provider';
export function Appearance() {
  const { theme, choose, status, retry } = useAppearance();
  return <main id="main-content" className="workspace appearance-workspace">
    <p className="settings-label">Settings / Appearance</p>
    <div className="workspace-heading"><div><h1>Make room for your thoughts.</h1><p>A familiar workspace, in a light that suits you.</p></div></div>
    <fieldset className="appearance-options"><legend>Choose your appearance</legend><p className="appearance-help">Select a preview to apply it instantly. Canvas is Glyph’s recommended appearance.</p>
      <div className="theme-grid">{themes.map(option => <label className="theme-option" key={option.id}>
        <input type="radio" name="appearance" value={option.id} checked={theme === option.id} onChange={() => choose(option.id)} />
        <span className="theme-card"><span className="theme-preview" data-theme={option.id} aria-hidden="true">
          <span className="preview-rail"><b>g.</b><i /><i /><i /></span>
          <span className="preview-page"><span className="preview-title">Your notes <span className="preview-button">+ New</span></span><span className="preview-sheet"><strong>A thought worth keeping</strong><span className="preview-lines" /><span className="preview-chart">{[35, 58, 44, 76, 64, 92].map((height, index) => <i key={index} style={{ height: `${height}%`, background: `var(--chart-${index % 3 + 1})` }} />)}</span><span className="preview-status">Published</span></span></span>
        </span><span className="theme-caption"><strong>{option.id === 'system' && <Monitor size={15} />}{option.name}</strong><span>{theme === option.id ? <Check size={17} aria-label="Selected" /> : option.label}</span></span><span className="theme-description">{option.description}</span></span>
      </label>)}</div>
    </fieldset>
    <div className="appearance-note"><Monitor size={19} /><p><strong>Comfort without extra settings</strong><span>System follows your device’s light or dark preference automatically. Motion follows your device’s accessibility settings in every appearance.</span></p></div>
    <div className="appearance-feedback"><p role="status" aria-live="polite">{status || 'Changes save automatically. Your notes and published content stay the same.'}</p>{(status.includes('failed') || status.includes('unavailable')) && <button className="button small" onClick={retry}>Retry account sync</button>}</div>
  </main>;
}
