# contrast-checker

WCAG colour contrast checker. Enter a text and background colour (hex, rgb, or a CSS name) and
see the contrast ratio, pass/fail for WCAG AA and AAA (normal + large text) and UI components,
a live preview, and a suggested passing colour. Shareable via `?fg=&bg=`. Client-side only.

**Live:** https://contrast-checker.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/contrast.ts`](src/contrast.ts) implements the WCAG 2.1 relative-luminance formula and
ratio `(L_light + 0.05) / (L_dark + 0.05)`. Verified: #000/#fff = 21.00, #767676/#fff = 4.54,
red/white = 4.00. `suggestFg` nudges the text colour toward black or white until it clears the
target ratio.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
