import { useEffect, useMemo, useState } from 'react';
import { evaluate, luminance, parseColor, suggestFg, toHex } from './contrast';

const luminanceHex = (hex: string) => {
  const c = parseColor(hex);
  return c ? luminance(c) : 0;
};

function readInitial(): { fg: string; bg: string } {
  const p = new URLSearchParams(window.location.search);
  const fg = p.get('fg');
  const bg = p.get('bg');
  if (fg && bg && parseColor(fg) && parseColor(bg)) return { fg: '#' + fg.replace('#', ''), bg: '#' + bg.replace('#', '') };
  try {
    const raw = localStorage.getItem('contrast.pair');
    if (raw) {
      const j = JSON.parse(raw);
      if (parseColor(j.fg) && parseColor(j.bg)) return j;
    }
  } catch {
    /* ignore */
  }
  return { fg: '#3b4a63', bg: '#f4f6fb' };
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`check ${ok ? 'pass' : 'fail'}`}>
      <span className="mark">{ok ? '✓' : '✕'}</span>
      <span>{label}</span>
      <span className="tag">{ok ? 'Pass' : 'Fail'}</span>
    </div>
  );
}

export default function App() {
  const init = readInitial();
  const [fg, setFg] = useState(init.fg);
  const [bg, setBg] = useState(init.bg);
  const [copied, setCopied] = useState('');

  const fgRgb = useMemo(() => parseColor(fg), [fg]);
  const bgRgb = useMemo(() => parseColor(bg), [bg]);
  const valid = fgRgb && bgRgb;
  const verdict = valid ? evaluate(fgRgb, bgRgb) : null;
  const fix = valid ? suggestFg(fgRgb, bgRgb, 4.5) : null;

  useEffect(() => {
    if (!valid) return;
    try {
      localStorage.setItem('contrast.pair', JSON.stringify({ fg, bg }));
    } catch {
      /* ignore */
    }
    const p = new URLSearchParams();
    p.set('fg', toHex(fgRgb).slice(1));
    p.set('bg', toHex(bgRgb).slice(1));
    window.history.replaceState(null, '', `?${p}`);
    setCopied('');
  }, [fg, bg, valid, fgRgb, bgRgb]);

  const swap = () => {
    setFg(bg);
    setBg(fg);
  };

  const copy = async (text: string, which: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  };

  const ratioText = verdict ? verdict.ratio.toFixed(2) + ' : 1' : '—';
  const grade = !verdict ? '' : verdict.aaaNormal ? 'Excellent' : verdict.aaNormal ? 'Good' : verdict.aaLarge ? 'Poor (large text only)' : 'Fail';

  return (
    <div className="app">
      <header className="hero">
        <h1>Colour Contrast Checker</h1>
        <p className="tagline">Check any text and background colour against the WCAG accessibility guidelines, with a live preview.</p>
      </header>

      <div className="pickers">
        <ColorField label="Text colour" value={fg} onChange={setFg} onCopy={() => copy(fg, 'fg')} copied={copied === 'fg'} />
        <button className="swap" onClick={swap} aria-label="Swap colours" title="Swap colours">⇅</button>
        <ColorField label="Background" value={bg} onChange={setBg} onCopy={() => copy(bg, 'bg')} copied={copied === 'bg'} />
      </div>

      <div
        className="preview"
        style={valid ? { color: toHex(fgRgb), background: toHex(bgRgb) } : undefined}
      >
        {valid ? (
          <>
            <p className="big">Large text — 24px / bold 18.66px</p>
            <p className="body">
              Normal body text at 16px. The quick brown fox jumps over the lazy dog while a
              screen reader user relies on you getting this contrast right.
            </p>
            <p className="small">Small print at 13px — the hardest to read.</p>
          </>
        ) : (
          <p className="body">Enter two valid colours (hex like #1a2b3c, rgb(), or a name).</p>
        )}
      </div>

      {verdict && (
        <section className="result" aria-live="polite">
          <div className="ratio">
            <strong>{ratioText}</strong>
            <span>contrast ratio · {grade}</span>
          </div>
          <div className="checks">
            <Check ok={verdict.aaNormal} label="WCAG AA — normal text (4.5:1)" />
            <Check ok={verdict.aaLarge} label="WCAG AA — large text (3:1)" />
            <Check ok={verdict.aaaNormal} label="WCAG AAA — normal text (7:1)" />
            <Check ok={verdict.aaaLarge} label="WCAG AAA — large text (4.5:1)" />
            <Check ok={verdict.uiComponents} label="AA — UI components & graphics (3:1)" />
          </div>
          {fix && (
            <p className="fix">
              Not passing AA for normal text. Closest fix — set the text colour to{' '}
              <button
                className="chip"
                onClick={() => setFg(fix)}
                style={{ background: fix, color: luminanceHex(fix) > 0.4 ? '#000' : '#fff' }}
              >
                {fix}
              </button>
            </p>
          )}
        </section>
      )}

      <p className="disclaimer">
        Contrast is calculated with the WCAG 2.1 relative-luminance formula. “Large text” means
        18.66px bold or 24px and up. Passing contrast is necessary but not sufficient for
        accessibility — also check focus states, non-colour cues and real devices.
      </p>

      <section className="explainer">
        <h2>What is colour contrast, and why does it matter?</h2>
        <p>
          Contrast ratio measures how different two colours are in lightness, from 1:1 (identical)
          to 21:1 (black on white). People with low vision, colour blindness, or just a phone in
          bright sun need enough contrast to read your text. The WCAG guidelines set minimums
          that also underpin accessibility law in many countries.
        </p>
        <h3>The thresholds</h3>
        <table>
          <thead><tr><th>Level</th><th>Normal text</th><th>Large text</th></tr></thead>
          <tbody>
            <tr><td>WCAG AA (the common target)</td><td>4.5 : 1</td><td>3 : 1</td></tr>
            <tr><td>WCAG AAA (enhanced)</td><td>7 : 1</td><td>4.5 : 1</td></tr>
            <tr><td>UI components &amp; graphics</td><td colSpan={2}>3 : 1</td></tr>
          </tbody>
        </table>
        <h3>FAQ</h3>
        <h4>What counts as “large text”?</h4>
        <p>At least 18.66px (14pt) bold, or 24px (18pt) regardless of weight.</p>
        <h4>Does contrast apply to disabled buttons or placeholder text?</h4>
        <p>Disabled controls are exempt from the text minimums. Placeholder text is not exempt if it conveys information — don’t rely on faint placeholders as labels.</p>
        <h4>Can I share a result?</h4>
        <p>Yes — the URL updates with your two colours, so copying the link shares the exact check.</p>
        <footer>Uses the WCAG 2.1 contrast algorithm. Not affiliated with the W3C.</footer>
      </section>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const rgb = parseColor(value);
  return (
    <label className="cfield">
      <span>{label}</span>
      <div className={`crow ${rgb ? '' : 'bad'}`}>
        <input
          type="color"
          value={rgb ? toHex(rgb) : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} swatch`}
        />
        <input
          className="hex"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={`${label} value`}
        />
        <button type="button" onClick={onCopy} aria-label="Copy">{copied ? '✓' : '⧉'}</button>
      </div>
    </label>
  );
}
