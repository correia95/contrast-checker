export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function parseColor(input: string): RGB | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (s[0] !== '#' && /^[0-9a-f]{3,8}$/.test(s)) s = '#' + s;

  if (/^#([0-9a-f]{3})$/.test(s)) {
    const h = s.slice(1);
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
  }
  if (/^#([0-9a-f]{6})$/.test(s)) {
    return { r: parseInt(s.slice(1, 3), 16), g: parseInt(s.slice(3, 5), 16), b: parseInt(s.slice(5, 7), 16) };
  }
  const m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };

  const named = NAMED[s];
  if (named) return parseColor(named);
  return null;
}

export function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(c: RGB): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export interface Verdict {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  uiComponents: boolean; // AA non-text 3:1
}

export function evaluate(fg: RGB, bg: RGB): Verdict {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    uiComponents: ratio >= 3,
  };
}

/** Nudge the foreground toward black or white until it passes `target`, return the hex. */
export function suggestFg(fg: RGB, bg: RGB, target = 4.5): string | null {
  if (contrastRatio(fg, bg) >= target) return null;
  const bgLum = luminance(bg);
  const towardWhite = bgLum < 0.5;
  let best: RGB | null = null;
  for (let t = 0.02; t <= 1.001; t += 0.02) {
    const mix = towardWhite
      ? { r: fg.r + (255 - fg.r) * t, g: fg.g + (255 - fg.g) * t, b: fg.b + (255 - fg.b) * t }
      : { r: fg.r * (1 - t), g: fg.g * (1 - t), b: fg.b * (1 - t) };
    if (contrastRatio(mix, bg) >= target) {
      best = mix;
      break;
    }
  }
  return best ? toHex(best) : towardWhite ? '#ffffff' : '#000000';
}

const NAMED: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  navy: '#000080', teal: '#008080', purple: '#800080', orange: '#ffa500', gray: '#808080',
  grey: '#808080', silver: '#c0c0c0', maroon: '#800000', olive: '#808000', lime: '#00ff00',
  aqua: '#00ffff', fuchsia: '#ff00ff', yellow: '#ffff00', pink: '#ffc0cb', gold: '#ffd700',
  indigo: '#4b0082', coral: '#ff7f50', crimson: '#dc143c', slategray: '#708090',
  tomato: '#ff6347', dodgerblue: '#1e90ff', rebeccapurple: '#663399',
};
