export const themeIds = ['canvas', 'midnight', 'graphite', 'sage', 'frost', 'system'] as const;
export type ThemeId = typeof themeIds[number];
export function isTheme(value: unknown): value is ThemeId { return typeof value === 'string' && themeIds.includes(value as ThemeId); }
export const themes = [
  { id: 'canvas', name: 'Canvas', description: 'Warm paper, charcoal ink, a trace of copper.', label: 'Recommended' },
  { id: 'midnight', name: 'Midnight', description: 'Layered graphite with warm, quiet highlights.' },
  { id: 'graphite', name: 'Graphite', description: 'Neutral greys for an uninterrupted train of thought.' },
  { id: 'sage', name: 'Sage', description: 'Soft botanical tones on a warm neutral canvas.' },
  { id: 'frost', name: 'Frost', description: 'Cool paper, slate ink and crisp blue details.' },
  { id: 'system', name: 'System', description: 'Canvas by day or Midnight by night, following your device.' },
] satisfies { id: ThemeId; name: string; description: string; label?: string }[];
export function themeCookie(owner: string | null) { return `glyph-appearance-${owner ?? 'guest'}`; }
