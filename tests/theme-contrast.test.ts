import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const css = readFileSync('src/app/themes.css', 'utf8');
function luminance(hex: string) {
  const [r, g, b] = hex.match(/[a-f0-9]{2}/gi)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return r * .2126 + g * .7152 + b * .0722;
}
it('maintains AA text, status and action contrast in every palette', () => {
  const palettes = [...css.matchAll(/[^{}]+\{([^{}]*--page:[^{}]*)\}/g)];
  expect(palettes.filter(([, block]) => block.includes("--accent:")).length).toBe(6);
  for (const [, block] of palettes.filter(([, block]) => block.includes("--accent:"))) {
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f0-9]{6})/g)].map(m => [m[1], m[2]]));
    for (const [foreground, background] of [['ink', 'page'], ['muted', 'page'], ['muted', 'surface'], ['accent', 'raised'], ['success', 'success-soft'], ['danger', 'danger-soft'], ['on-primary', 'primary'], ['on-accent', 'accent']]) {
      const a = luminance(tokens[foreground]), b = luminance(tokens[background]);
      expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), `${foreground} on ${background} in ${tokens.page}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

